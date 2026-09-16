// MERCHY — Costo y fecha de envío según destino, cantidad de piezas
// (cajas) y tiempo de producción (ver charla 2026-09-16: "Método de envío
// hay que repensarlo por completo"). Todo lo que aquí es "estimado" queda
// editable en Configuración (shipping_zones, categories.pzas_per_box) --
// nunca son tarifas reales de una paquetería todavía.
import type { CartItem, ProductionTimeTier, ShippingType, ShippingZone } from "@/types";

// Piezas por caja por default cuando la categoría del producto no trae su
// propio estimado configurado (nunca debería pasar con las categorías
// reales, pero un producto sin categoría no debe romper el cálculo).
const DEFAULT_PZAS_PER_BOX = 30;

/** Cuántas cajas ocupa UN renglón del carrito -- redondeado hacia arriba, mínimo 1. */
export function countBoxes(item: CartItem): number {
  const perBox = item.product.category?.pzas_per_box ?? DEFAULT_PZAS_PER_BOX;
  return Math.max(1, Math.ceil(item.total_quantity / Math.max(1, perBox)));
}

/** Total de cajas de todo el carrito -- cada renglón se redondea aparte. */
export function totalBoxes(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + countBoxes(item), 0);
}

/** Zona cuya lista de estados (clave INEGI) incluye este cveEnt. null si
 * ninguna zona lo cubre todavía -- nunca se inventa una. */
export function getShippingZone(cveEnt: string, zones: ShippingZone[]): ShippingZone | null {
  return zones.find((z) => z.cve_ent_list.includes(cveEnt)) ?? null;
}

/** Costo total de envío = costo por caja de la zona+tipo × total de cajas. */
export function getShippingCost(zone: ShippingZone, type: ShippingType, boxes: number): number {
  const perBox = type === "express" ? zone.express_cost_per_box : zone.standard_cost_per_box;
  return Math.round(perBox * boxes * 100) / 100;
}

/** Tramo de producción según la cantidad de ESE renglón. null si ningún
 * tramo lo cubre (tabla incompleta) -- el llamador decide qué hacer. */
export function getProductionTier(qty: number, tiers: ProductionTimeTier[]): ProductionTimeTier | null {
  return tiers.find((t) => qty >= t.qty_min && (t.qty_max == null || qty <= t.qty_max)) ?? null;
}

/** Suma N días HÁBILES a una fecha, saltando sábado/domingo únicamente.
 * Días festivos mexicanos NO se consideran (fuera de alcance por ahora,
 * ver charla 2026-09-16) -- el estimado puede quedar corto en un festivo. */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

/** Rango de fecha de entrega estimada: producción (el tramo más lento
 * entre todos los renglones del carrito -- un pedido no está listo hasta
 * que TODO lo esté) + envío de la zona/tipo elegido, contando desde
 * "mañana". null si falta algún dato real (zona o tramo de producción de
 * algún renglón) -- nunca se inventa una fecha. */
export function computeEtaRange(
  items: CartItem[],
  zone: ShippingZone,
  type: ShippingType,
  tiers: ProductionTimeTier[]
): { min: Date; max: Date } | null {
  if (items.length === 0) return null;
  let prodDiasMin = 0;
  let prodDiasMax = 0;
  for (const item of items) {
    const tier = getProductionTier(item.total_quantity, tiers);
    if (!tier) return null;
    prodDiasMin = Math.max(prodDiasMin, tier.dias_min);
    prodDiasMax = Math.max(prodDiasMax, tier.dias_max);
  }
  const shipDiasMin = type === "express" ? zone.express_dias_min : zone.standard_dias_min;
  const shipDiasMax = type === "express" ? zone.express_dias_max : zone.standard_dias_max;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    min: addBusinessDays(today, prodDiasMin + shipDiasMin),
    max: addBusinessDays(today, prodDiasMax + shipDiasMax),
  };
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "Llega el 4 de octubre de 2026" / "Llega entre el 3 y el 4 de octubre de
 * 2026" / "Llega entre el 30 de septiembre y el 4 de octubre de 2026" --
 * mismo estilo que Mercado Libre (ver charla 2026-09-16). */
export function formatEtaRange(min: Date, max: Date): string {
  const sameDay = min.toDateString() === max.toDateString();
  if (sameDay) return `Llega el ${min.getDate()} de ${MESES[min.getMonth()]} de ${min.getFullYear()}`;

  const sameMonthYear = min.getMonth() === max.getMonth() && min.getFullYear() === max.getFullYear();
  if (sameMonthYear) {
    return `Llega entre el ${min.getDate()} y el ${max.getDate()} de ${MESES[max.getMonth()]} de ${max.getFullYear()}`;
  }
  const minLabel = min.getFullYear() === max.getFullYear()
    ? `${min.getDate()} de ${MESES[min.getMonth()]}`
    : `${min.getDate()} de ${MESES[min.getMonth()]} de ${min.getFullYear()}`;
  return `Llega entre el ${minLabel} y el ${max.getDate()} de ${MESES[max.getMonth()]} de ${max.getFullYear()}`;
}
