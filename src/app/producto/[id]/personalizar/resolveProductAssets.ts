import fs from "fs";
import path from "path";
import type { Product } from "@/types";
import { VIEW_ORDER, type GarmentColor, type ResolvedProductAssets, emptyResolvedAssets } from "./types";

// Server-only: resolves a product's real per-view photography from the local
// filesystem. Nothing here runs in the browser — only called from the
// personalizar page.tsx Server Component.
//
// Folder convention (documented for whoever copies the real files in later):
//   public/VISTA DE PRODUCTOS/{Nombre exacto del producto}/frente-blanco.png
//   public/VISTA DE PRODUCTOS/{Nombre exacto del producto}/ejes/frente-blanco.png  ← also checked, if present
// The product folder is matched against the product's `name` in the
// database, ignoring case/accents/extra whitespace — so "Playera Over",
// "PLAYERA OVER" and "playera   over" all resolve to the same folder. No
// code changes are ever needed to support a new product: just add a folder
// named after it.
//
// Per view, accepted filenames (extensions tried in this order: png, webp,
// jpg, jpeg, svg; filename casing is also ignored):
//   {view}-blanco.*  /  {view}-negro.*
// If a product only has one version per view (no color distinction), a
// color-less file (e.g. "frente.png") is used for both blanco and negro —
// the auto color-switch simply has no visible effect for that product.
// If no matching product folder exists at all, every view falls back to
// the shared generic mockup already used today (VIEW_ASSETS) — never a
// blank/broken image.

const EXTENSIONS = ["png", "webp", "jpg", "jpeg", "svg"];
const PRODUCTS_ROOT_NAME = "VISTA DE PRODUCTOS";

function normalizeName(value: string): string {
  return value
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function listDirs(dir: string): fs.Dirent[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
}

function findMatchingDir(parentDir: string, targetName: string): string | null {
  const target = normalizeName(targetName);
  const match = listDirs(parentDir).find((e) => normalizeName(e.name) === target);
  return match ? path.join(parentDir, match.name) : null;
}

// Case-insensitive file lookup: builds a normalized-name -> real filename
// map for the directory once, so we're never relying on the host OS's own
// filesystem case sensitivity (macOS is case-insensitive by default, the
// Vercel/Linux production filesystem is not — matching explicitly here
// keeps local testing and production behavior identical).
function buildFileIndex(dir: string): Map<string, string> {
  const index = new Map<string, string>();
  if (!fs.existsSync(dir)) return index;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) index.set(entry.name.toLowerCase(), entry.name);
  }
  return index;
}

function findFile(fileIndex: Map<string, string>, dir: string, baseName: string): string | null {
  for (const ext of EXTENSIONS) {
    const real = fileIndex.get(`${baseName}.${ext}`.toLowerCase());
    if (real) return path.join(dir, real);
  }
  return null;
}

function toPublicUrl(absPath: string, publicRoot: string): string {
  const relative = path.relative(publicRoot, absPath).split(path.sep).join("/");
  return `/${relative}`;
}

export function resolveProductViewAssets(product: Pick<Product, "id" | "name">): ResolvedProductAssets {
  const publicRoot = path.join(process.cwd(), "public");
  const productsRoot = path.join(publicRoot, PRODUCTS_ROOT_NAME);

  const result = emptyResolvedAssets();

  const productDir = findMatchingDir(productsRoot, product.name);
  if (!productDir) return result;

  const ejesDir = findMatchingDir(productDir, "ejes");
  const baseDir = ejesDir ?? productDir;
  const fileIndex = buildFileIndex(baseDir);

  for (const view of VIEW_ORDER) {
    const colorless = findFile(fileIndex, baseDir, view);
    for (const color of ["blanco", "negro"] as GarmentColor[]) {
      const withColor = findFile(fileIndex, baseDir, `${view}-${color}`);
      const resolved = withColor ?? colorless;
      result[view][color] = resolved ? toPublicUrl(resolved, publicRoot) : null;
    }
  }

  return result;
}