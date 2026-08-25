import type { PriceTier, PrintTechnique } from "@/types";

export function getProductUnitPrice(
  costo: number,
  totalQty: number,
  tiers: PriceTier[]
): number {
  const tier = tiers.find(
    (t) => totalQty >= t.qty_min && (t.qty_max === null || totalQty <= t.qty_max)
  );
  if (!tier) return 0;
  // Redondeo siempre hacia arriba (nunca al más cercano): así lo define la
  // tabla de referencia del cliente — garantiza que el margen mínimo del
  // tramo nunca se erosione por redondear hacia abajo.
  return Math.ceil(costo / (1 - tier.margin_pct));
}

export function getTechniquePrice(
  technique: PrintTechnique,
  totalQty: number,
  numElements: number
): number {
  const tier = technique.price_table.find(
    (t) => totalQty >= t.qty_min && (t.qty_max === null || totalQty <= t.qty_max)
  );
  if (!tier || numElements === 0) return 0;
  return tier.price_per_element * numElements;
}

// ---- Selección múltiple de técnicas, cada una con su propio parámetro ----
// Ninguna de estas tres funciones inventa, interpola ni copia un precio de
// otro renglón/tamaño/técnica: si no hay un renglón que coincida EXACTO
// con lo pedido, regresan null (el llamador lo muestra como "requiere
// cotización" / "esta medida requiere cotización").

/** pricing_type "by_qty" (ej. DTG) -- precio por elemento según cantidad total. */
export function findQtyPrice(technique: PrintTechnique, totalQty: number): number | null {
  const tier = technique.price_table.find(
    (t) => t.tintas === undefined && t.size === undefined && totalQty >= t.qty_min && (t.qty_max === null || totalQty <= t.qty_max)
  );
  return tier ? tier.price_per_element : null;
}

/** pricing_type "by_tintas" (ej. Serigrafía, Tampografía) -- por número de tintas Y cantidad total. */
export function findTintasPrice(technique: PrintTechnique, tintas: number, totalQty: number): number | null {
  const tier = technique.price_table.find(
    (t) => t.tintas === tintas && totalQty >= t.qty_min && (t.qty_max === null || totalQty <= t.qty_max)
  );
  return tier ? tier.price_per_element : null;
}

/** pricing_type "by_size" (ej. DTF Textil, DTF UV) -- por tamaño del logo Y cantidad total. */
export function findSizePrice(technique: PrintTechnique, size: string, totalQty: number): number | null {
  const tier = technique.price_table.find(
    (t) => t.size === size && totalQty >= t.qty_min && (t.qty_max === null || totalQty <= t.qty_max)
  );
  return tier ? tier.price_per_element : null;
}

export function calculateUnitPrice(
  costo: number,
  totalQty: number,
  tiers: PriceTier[],
  technique: PrintTechnique | null,
  numElements: number
): number {
  const productPrice = getProductUnitPrice(costo, totalQty, tiers);
  const techPrice = technique
    ? getTechniquePrice(technique, totalQty, numElements)
    : 0;
  return productPrice + techPrice;
}

export function getPriceTierLabel(totalQty: number, tiers: PriceTier[]): string {
  const tier = tiers.find(
    (t) => totalQty >= t.qty_min && (t.qty_max === null || totalQty <= t.qty_max)
  );
  return tier?.label ?? "";
}

export function formatMXN(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
