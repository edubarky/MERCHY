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
  return Math.round(costo / (1 - tier.margin_pct));
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
