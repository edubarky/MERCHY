import fs from "fs";
import path from "path";
import type { Product } from "@/types";
import {
  VIEW_ORDER,
  GARMENT_COLORS,
  type ViewName,
  type GarmentColor,
  type ResolvedProductAssets,
  emptyResolvedAssets,
} from "./types";

// Real per-color photo subfolders (e.g.
// public/VISTA DE PRODUCTOS/SUDADERA OCEAN/SUDADERA  OCEAN BLANCO/) — one
// per garment color, holding its own view files (frente/reverso/izquierda/
// derecha) plus an optional "... con modelo.png". Unlike the flat blanco/
// negro files this product used to have directly in its root (still
// supported below as the fallback for any product without color
// subfolders), these need no color suffix in the filename — the folder
// itself IS the color.
//
// This is a GENERIC mechanism, not hardcoded to one product: for every
// product, every one of the 6 GARMENT_COLORS is checked against that
// product's own subfolders, matched by the color word appearing as its own
// whitespace-separated token in the folder's normalized name (accent/case/
// whitespace-insensitive, same tolerance as everywhere else in this file)
// — so "SUDADERA  OCEAN BLANCO" (note the real double space) matches
// "blanco" as cleanly as a folder named just "BLANCO" would. A product with
// no such subfolders (i.e. every other product today) sees zero behavior
// change: findColorSubdir simply returns null for all 6 colors and the
// flat scan's blanco/negro result (if any) is all that's used, exactly as
// before.
function findColorSubdir(productDir: string, color: GarmentColor): string | null {
  const match = listDirs(productDir).find((e) => normalizeName(e.name).split(" ").includes(color));
  return match ? path.join(productDir, match.name) : null;
}

// NOTE on izquierda/derecha: every real file for Sudadera Ocean (blanco,
// negro, and the 4 extra colors below) is named for the side it actually
// shows — verified visually via the garment's own FRONT markers (the
// drawstring + kangaroo pocket, both only ever on the front of the body):
// in every "DERECHO*"/"IZQUIERDO*" file, those front markers sit on the
// matching side of the frame (DERECHO* -> markers on the right,
// IZQUIERDO* -> markers on the left), which is what actually determines
// which real side of the wearer a profile photo shows — NOT which way the
// hood's own peak/tip happens to lean (that's the back of the hood, and
// leans opposite the face-opening; using it as the signal is what caused
// two earlier, incorrect "fixes" in this exact spot — confirmed wrong by
// the user both times). So: no remapping needed anywhere here, for any of
// the 6 colors — every file is used exactly as its own name says.

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
// reverso/espalda/back, izquierd*/left, derech*/right, funda/bolsa/case),
// and its color is whichever of blanco/negro (or b/n as the last
// whitespace-separated token, or white/black) is present — if none, the
// file is used for EVERY color this product actually has (a real bug,
// confirmed live on Tapete de Yoga Minsk: its only file is a colorless
// "FRENTE.png", but the variant is "Gris" — an earlier version of this
// loop only ever filled the colorless fallback into the blanco/negro
// slots, so a product whose real color isn't blanco/negro saw "Fotografías
// no disponibles aún" even though a perfectly good photo existed). A
// product/view with no matching file at all (colored or colorless)
// resolves to null and the Personalizador shows an empty state — there's
// no generic mockup fallback (removed on purpose, see PersonalizerClient.tsx).

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
  // Dos ejes, no uno -- "FUNDA HORIZONTAL.png"/"FUNDA VERTICAL.png" son
  // fotos reales distintas de la misma funda en cada orientación (ver
  // ViewName), así que se distinguen por esa palabra, no solo por
  // "FUNDA" (que ambos nombres de archivo comparten). Revisados ANTES de
  // cualquier stem que pudiera contener "FUNDA" a secas, para que nunca
  // dependa del orden de VIEW_STEMS.
  ["fundaHorizontal", ["HORIZONTAL"]],
  ["fundaVertical", ["VERTICAL"]],
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
    // Antes esto solo llenaba blanco/negro (ver nota arriba) -- ahora se
    // resuelve para los 6 colores reales: detectColor solo detecta blanco/
    // negro desde el propio nombre de archivo, así que para cualquier otro
    // color (gris, royal, marino, rojo) "explicit" siempre es undefined y
    // cae directo al colorless, exactamente el comportamiento que ya
    // describía este mismo comentario ("se usa para todos los colores").
    for (const color of GARMENT_COLORS) {
      const explicit = viewMatches.find((m) => m.color === color);
      const resolved = explicit ?? colorless;
      result[view][color] = resolved ? toPublicUrl(path.join(baseDir, resolved.file), publicRoot) : null;
      log(`  Imagen cargada — ${view} (${color}):`, resolved ? resolved.file : "no encontrada");
    }
  }

  // Per-color subfolders, if this product has them (see findColorSubdir
  // above) — checked for EVERY color, blanco/negro included, not just the
  // 4 that historically lacked a flat-file source. When a subfolder exists
  // for a color, it fully REPLACES whatever the flat scan found for that
  // color (reset to null, then refilled from the subfolder) — the
  // subfolder is the authoritative source once it exists, so a stray/
  // stale flat-file match never lingers. Colors without a matching
  // subfolder keep exactly whatever the flat scan above already resolved
  // (or null, same as always).
  for (const color of GARMENT_COLORS) {
    const colorDir = findColorSubdir(productDir, color);
    if (!colorDir) continue;
    log(`Subcarpeta de color "${color}" encontrada —`, colorDir);
    const colorFiles = listFiles(colorDir);
    log(`  archivos:`, colorFiles);
    for (const view of VIEW_ORDER) {
      result[view][color] = null;
    }
    for (const file of colorFiles) {
      const ext = path.extname(file).slice(1).toLowerCase();
      if (!EXTENSIONS.includes(ext)) continue;
      const baseNoExt = stripAccents(file.slice(0, file.length - ext.length - 1)).toUpperCase();
      const fileView = detectView(baseNoExt);
      if (!fileView) continue;
      // No remap — this color's own IZQUIERDO*/DERECHO* name already
      // matches the real side of the wearer (see the note above).
      result[fileView][color] = toPublicUrl(path.join(colorDir, file), publicRoot);
      log(`    Imagen cargada — ${fileView} (${color}):`, file);
    }
  }

  return result;
}

function findModeloFile(dir: string): string | null {
  return (
    listFiles(dir).find((f) => {
      const ext = path.extname(f).slice(1).toLowerCase();
      if (!EXTENSIONS.includes(ext)) return false;
      return stripAccents(f).toUpperCase().includes("MODELO");
    }) ?? null
  );
}

// Foto "con modelo" -- por color, cuando el producto tiene subcarpetas de
// color (ver findColorSubdir arriba): cada subcarpeta puede traer su
// propia "... con modelo.png" (ej. "Sudadera Ocean Blanco con modelo.png"
// dentro de la subcarpeta de blanco), así que al elegir un color distinto
// en la ficha del producto también cambia la foto con modelo, no solo los
// ejes. Un archivo suelto "MODELO" directo en la raíz del producto (sin
// subcarpeta de color) sigue funcionando igual que antes -- se usa como
// respaldo compartido para cualquier color que no tenga su propia
// subcarpeta o su propio archivo "con modelo". null para un color sin
// ninguna de las dos cosas -- nunca se inventa una foto, ni se reutiliza
// la de otro color a propósito.
export function resolveProductModelShots(product: Pick<Product, "id" | "name">): Record<GarmentColor, string | null> {
  const publicRoot = path.join(process.cwd(), "public");
  const productsRoot = path.join(publicRoot, PRODUCTS_ROOT_NAME);
  const result = Object.fromEntries(GARMENT_COLORS.map((c) => [c, null])) as Record<GarmentColor, string | null>;

  const productDir = findMatchingDir(productsRoot, product.name);
  if (!productDir) return result;

  const rootFile = findModeloFile(productDir);
  const rootUrl = rootFile ? toPublicUrl(path.join(productDir, rootFile), publicRoot) : null;
  for (const color of GARMENT_COLORS) result[color] = rootUrl;

  for (const color of GARMENT_COLORS) {
    const colorDir = findColorSubdir(productDir, color);
    if (!colorDir) continue;
    const file = findModeloFile(colorDir);
    // Subcarpeta de color encontrada -> ese color ya no depende del
    // archivo suelto de la raíz (aunque exista): usa el propio de su
    // subcarpeta, o null si esa subcarpeta no trae uno.
    result[color] = file ? toPublicUrl(path.join(colorDir, file), publicRoot) : null;
  }

  return result;
}