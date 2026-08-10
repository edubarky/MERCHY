import fs from "fs";
import path from "path";
import type { Product } from "@/types";
import { VIEW_ORDER, type ViewName, type GarmentColor, type ResolvedProductAssets, emptyResolvedAssets } from "./types";

// Server-only: resolves a product's real per-view photography from the local
// filesystem. Nothing here runs in the browser — only called from the
// personalizar page.tsx Server Component.
//
// Real folder convention, copied in from the design source
// ("DISEÑO DE PAG./VISTA DE PRODUCTOS/") into public/VISTA DE PRODUCTOS/:
//   public/VISTA DE PRODUCTOS/{Nombre exacto del producto}/FRENTE B.png
//   public/VISTA DE PRODUCTOS/{Nombre exacto del producto}/ejes/FRENTE B.png  ← also checked, if present
// The product folder is matched against the product's `name` in the
// database by comparing normalized (case/accent/whitespace-insensitive)
// names against the real fs.readdirSync entries — never a synthesized or
// slugified path. Whichever real directory entry matches is the one used.
//
// Files inside are matched by *scanning and classifying*, not by
// constructing one exact expected filename — the real files look like
// "FRENTE B.png" / "FRENTE N.png" / "IZQUIERDO N.png" / "DERECHO B.png"
// (Spanish, masculine for izquierdo/derecho, single-letter color suffix
// separated by a space), which is different from the "frente-blanco.png"
// convention assumed in an earlier pass. A file counts as belonging to a
// view if its name *contains* that view's keyword (frente/front,
// reverso/espalda/back, izquierd*/left, derech*/right — matching both
// masculine and feminine Spanish endings), and its color is whichever of
// blanco/negro (or b/n as the last whitespace-separated token, or
// white/black) is present — if none, the file is used for both colors
// (single-version product, auto color-switch has no visible effect).
// A product/view with no matching file resolves to null and the
// Personalizador shows an empty state — there's no generic mockup
// fallback (removed on purpose, see PersonalizerClient.tsx).

const EXTENSIONS = ["png", "webp", "jpg", "jpeg", "svg"];
const PRODUCTS_ROOT_NAME = "VISTA DE PRODUCTOS";

// "REVERS" (not "REVERSO") deliberately catches both REVERSO and REVERSA —
// the real dataset uses both across different product folders. "ATRAS" is
// a third synonym also found in the real data (e.g. "ATRÁS B.png"). All
// comparisons here run on an accent-stripped string (see stripAccents),
// so "ATRÁS" and "ATRAS" are the same thing to this matcher — no need to
// enumerate every accented/unaccented spelling by hand.
const VIEW_STEMS: [ViewName, string[]][] = [
  ["frente", ["FRENTE", "FRONT"]],
  ["reverso", ["REVERS", "ATRAS", "ESPALDA", "BACK"]],
  ["izquierda", ["IZQUIERD", "LEFT"]], // matches both izquierda/izquierdo
  ["derecha", ["DERECH", "RIGHT"]], // matches both derecha/derecho
];

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeName(value: string): string {
  return stripAccents(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function listDirs(dir: string): fs.Dirent[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);
}

function findMatchingDir(parentDir: string, targetName: string): string | null {
  const target = normalizeName(targetName);
  const match = listDirs(parentDir).find((e) => normalizeName(e.name) === target);
  return match ? path.join(parentDir, match.name) : null;
}

function detectView(nameUpper: string): ViewName | null {
  for (const [view, stems] of VIEW_STEMS) {
    if (stems.some((s) => nameUpper.includes(s))) return view;
  }
  return null;
}

function detectColor(baseNoExtUpper: string): GarmentColor | null {
  if (baseNoExtUpper.includes("BLANCO") || baseNoExtUpper.includes("WHITE")) return "blanco";
  if (baseNoExtUpper.includes("NEGRO") || baseNoExtUpper.includes("BLACK")) return "negro";
  const tokens = baseNoExtUpper.split(/[\s_-]+/).filter(Boolean);
  const last = tokens[tokens.length - 1];
  if (last === "B") return "blanco";
  if (last === "N") return "negro";
  return null;
}

function toPublicUrl(absPath: string, publicRoot: string): string {
  const relative = path.relative(publicRoot, absPath).split(path.sep).join("/");
  return `/${relative}`;
}

// TEMPORARY debug logging, requested explicitly to verify folder/file
// resolution while real product photography is being added. Runs
// server-side only — shows up in the terminal running `next dev`/
// `next start`, or in the Vercel function logs in production, never in
// the browser console. Flip DEBUG to false (or delete this block) once
// confirmed working end-to-end with real assets.
const DEBUG = true;
function log(...args: unknown[]) {
  if (DEBUG) console.log("[Personalizador][resolveProductAssets]", ...args);
}

export function resolveProductViewAssets(product: Pick<Product, "id" | "name">): ResolvedProductAssets {
  const publicRoot = path.join(process.cwd(), "public");
  const productsRoot = path.join(publicRoot, PRODUCTS_ROOT_NAME);
  const naiveAttemptedPath = path.join(productsRoot, product.name);

  log("Producto:", product.name);
  log("Ruta que se está utilizando:", naiveAttemptedPath);

  const result = emptyResolvedAssets();

  const productDir = findMatchingDir(productsRoot, product.name);
  if (!productDir) {
    log("Carpeta encontrada: No");
    if (fs.existsSync(productsRoot)) {
      log(
        "Motivo: no existe ninguna carpeta dentro de",
        productsRoot,
        "cuyo nombre coincida con",
        JSON.stringify(product.name),
        "— carpetas disponibles:",
        listDirs(productsRoot).map((d) => d.name)
      );
    } else {
      log("Motivo: ni siquiera existe la carpeta raíz", productsRoot);
    }
    return result;
  }
  log("Carpeta encontrada: Sí —", productDir);

  const ejesDir = findMatchingDir(productDir, "ejes");
  const baseDir = ejesDir ?? productDir;
  if (ejesDir) log("Subcarpeta /ejes/ encontrada, se usa:", baseDir);

  const files = listFiles(baseDir);
  log("Archivos encontrados:", files);

  const matches = files
    .map((file) => {
      const ext = path.extname(file).slice(1).toLowerCase();
      if (!EXTENSIONS.includes(ext)) return null;
      const baseNoExt = stripAccents(file.slice(0, file.length - ext.length - 1)).toUpperCase();
      const view = detectView(baseNoExt);
      if (!view) return null;
      return { file, view, color: detectColor(baseNoExt) };
    })
    .filter((m): m is { file: string; view: ViewName; color: GarmentColor | null } => m !== null);

  for (const view of VIEW_ORDER) {
    log("Vista solicitada:", view);
    const viewMatches = matches.filter((m) => m.view === view);
    const colorless = viewMatches.find((m) => m.color === null);
    const blanco = viewMatches.find((m) => m.color === "blanco") ?? colorless;
    const negro = viewMatches.find((m) => m.color === "negro") ?? colorless;

    result[view].blanco = blanco ? toPublicUrl(path.join(baseDir, blanco.file), publicRoot) : null;
    result[view].negro = negro ? toPublicUrl(path.join(baseDir, negro.file), publicRoot) : null;

    log(`  Imagen cargada — ${view} (blanco):`, blanco ? blanco.file : "no encontrada");
    log(`  Imagen cargada — ${view} (negro):`, negro ? negro.file : "no encontrada");
  }

  return result;
}