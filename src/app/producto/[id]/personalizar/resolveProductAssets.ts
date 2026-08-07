import fs from "fs";
import path from "path";
import type { Product } from "@/types";
import { VIEW_ORDER, type GarmentColor, type ResolvedProductAssets, emptyResolvedAssets } from "./types";

// Server-only: resolves a product's real per-view photography from the local
// filesystem (public/productos/{key}/...). Nothing here runs in the browser —
// only called from the personalizar page.tsx Server Component.
//
// Folder convention (documented for whoever copies the real files in later):
//   public/productos/{sku-slug}/ejes/frente-blanco.png   ← checked first
//   public/productos/{sku-slug}/frente-blanco.png        ← fallback if /ejes/ doesn't exist
// Accepted extensions, tried in this order: png, webp, jpg, jpeg, svg.
// If a product only has one version per view (no color distinction), a
// color-less file (e.g. "frente.png") is used for both blanco and negro —
// the auto color-switch simply has no visible effect for that product.
// If nothing is found at all, the view falls back to the shared generic
// mockup already used today (VIEW_ASSETS) — never a blank/broken image.

const EXTENSIONS = ["png", "webp", "jpg", "jpeg", "svg"];

function slugifyKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findFile(dir: string, baseName: string): string | null {
  for (const ext of EXTENSIONS) {
    const candidate = path.join(dir, `${baseName}.${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function toPublicUrl(absPath: string, publicRoot: string): string {
  const relative = path.relative(publicRoot, absPath).split(path.sep).join("/");
  return `/${relative}`;
}

export function resolveProductViewAssets(product: Pick<Product, "id" | "sku">): ResolvedProductAssets {
  const publicRoot = path.join(process.cwd(), "public");
  const folderKey = slugifyKey(product.sku || product.id);
  const productRoot = path.join(publicRoot, "productos", folderKey);

  const ejesDir = path.join(productRoot, "ejes");
  const baseDir = fs.existsSync(ejesDir) && fs.statSync(ejesDir).isDirectory() ? ejesDir : productRoot;

  const result = emptyResolvedAssets();
  if (!fs.existsSync(baseDir)) return result;

  for (const view of VIEW_ORDER) {
    const colorless = findFile(baseDir, view);
    for (const color of ["blanco", "negro"] as GarmentColor[]) {
      const withColor = findFile(baseDir, `${view}-${color}`);
      const resolved = withColor ?? colorless;
      result[view][color] = resolved ? toPublicUrl(resolved, publicRoot) : null;
    }
  }

  return result;
}