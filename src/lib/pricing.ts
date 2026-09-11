import type { PriceTier, PrintTechnique, CartItem } from "@/types";

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

/** pricing_type "by_tintas" (ej. Serigrafía, Tampografía) -- la FILA de la
 * tabla ("No. de tintas") es `posiciones × tintas`, igual criterio que
 * ONPOINT: 2 posiciones × 1 tinta cuesta lo mismo que 1 posición × 2
 * tintas. El precio de esa fila se cobra UNA vez (las posiciones ya están
 * dentro del índice) -- no se multiplica por el número de logos. Si
 * `posiciones × tintas` se pasa de la fila más alta configurada, no se
 * inventa un precio -> null ("requiere cotización"). */
export function findTintasPrice(
  technique: PrintTechnique,
  tintas: number,
  posiciones: number,
  totalQty: number
): number | null {
  const fila = tintas * posiciones;
  if (!Number.isFinite(fila) || fila < 1) return null;
  const tier = technique.price_table.find(
    (t) => t.tintas === fila && totalQty >= t.qty_min && (t.qty_max === null || totalQty <= t.qty_max)
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

// ---- Medición automática del tamaño del logo (opcional, solo cuando hay
// medidas reales cargadas) ----
// widthPct/heightPct de un elemento son siempre % del área de impresión de
// esa vista (ver personalizar/types.ts) -- nunca cm por sí solos. Solo se
// pueden convertir a un tamaño real cuando esa vista/producto tiene sus
// propias medidas físicas (printAreas.ts -> widthCm/heightCm). Mientras un
// producto no tenga esas medidas cargadas, estas funciones regresan null y
// el llamador debe seguir usando el selector manual -- nunca se inventa
// una medida física que no fue configurada.

/** Tamaño real (cm) de un elemento a partir de su % y las medidas físicas reales del área de impresión de esa vista. null si el área todavía no tiene esas medidas. */
export function getElementRealCm(
  widthPct: number,
  heightPct: number,
  areaWidthCm: number | undefined,
  areaHeightCm: number | undefined
): { widthCm: number; heightCm: number } | null {
  if (!areaWidthCm || !areaHeightCm) return null;
  return { widthCm: (widthPct / 100) * areaWidthCm, heightCm: (heightPct / 100) * areaHeightCm };
}

/**
 * De los tamaños de tarifa que la técnica tiene configurados (ej. "5x5",
 * "10x10", "20x20"), regresa el más chico que sea >= a las medidas reales
 * del logo en AMBOS lados -- redondea siempre hacia el tamaño configurado
 * inmediato superior, nunca hacia abajo (para no erosionar el margen).
 *
 * Si el logo es más grande que el tamaño configurado más grande, regresa
 * ESE tamaño más grande (se cobra su tarifa) en vez de "requiere
 * cotización" -- decisión explícita del usuario para DTF Textil/DTF UV
 * mientras la tabla de precios real todavía no cubre medidas más grandes
 * que 20x20: "quiero que para medidas mayores de 20x20 cm se siga
 * manteniendo el precio de 20x20 cm hasta que tengamos completa la tabla
 * de precios y se pueda modificar más adelante". No es "inventar" un
 * precio nuevo -- es usar la tarifa real ya configurada del tamaño más
 * grande como tope, a propósito, hasta que existan tramos más grandes.
 * Si en el futuro se agregan tramos reales más grandes, este mismo código
 * los usa automáticamente sin cambios (el "tamaño más grande" que
 * encuentra ya no sería 20x20).
 */
export function roundUpToConfiguredSize(
  widthCm: number,
  heightCm: number,
  configuredSizes: string[]
): string | null {
  const parsed = configuredSizes
    .map((label) => {
      const [w, h] = label.split("x").map(Number);
      return { label, w, h };
    })
    .filter((p) => Number.isFinite(p.w) && Number.isFinite(p.h))
    .sort((a, b) => a.w * a.h - b.w * b.h);
  if (parsed.length === 0) return null;
  const fit = parsed.find((p) => widthCm <= p.w && heightCm <= p.h);
  return fit ? fit.label : parsed[parsed.length - 1].label;
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

// ---- IVA ----
// Los catálogos de MERCHY se manejan como PRECIO FINAL AL PÚBLICO. El
// precio del producto (getProductUnitPrice) ya trae IVA incluido. La tabla
// de precios de TÉCNICAS viene SIN IVA (así está la referencia del
// cliente), así que se le agrega aquí y se redondea hacia arriba al peso,
// mismo criterio de redondeo que getProductUnitPrice (nunca erosionar el
// margen).
export const IVA_RATE = 0.16;

export function techniquePriceWithIva(sinIva: number): number {
  return Math.ceil(sinIva * (1 + IVA_RATE));
}

/** Parte un total que YA incluye IVA en {subtotal, iva} -- para mostrarlo
 * desglosado. El IVA queda como exactamente 16% del subtotal
 * (subtotal = total ÷ 1.16; iva = total − subtotal). */
export function splitIva(totalConIva: number): { subtotal: number; iva: number } {
  const subtotal = Math.round(totalConIva / (1 + IVA_RATE));
  return { subtotal, iva: totalConIva - subtotal };
}

export function formatMXN(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---- Recalcular el precio de un renglón del carrito a otra cantidad ----
// Cambiar la cantidad en el carrito (ver carrito/page.tsx) tiene que
// respetar los mismos tramos por cantidad que ya se usaron al personalizar
// -- nunca solo escalar el precio guardado. Reproduce, por técnica, la
// MISMA fórmula que PersonalizerClient (ver ese archivo): by_qty ×
// num_elements; by_tintas con posiciones × tintas (num_logo_elements) +
// IVA de técnica; by_size sumando cada logo por su tamaño ya redondeado.
// Solo se puede recalcular con seguridad la técnica que coincide con
// item.technique (la única de la que se guarda price_table completo hoy,
// ver CartItem) -- cualquier otra conserva su precio ya guardado tal cual
// en vez de arriesgar un número inventado.
export function recomputeCartItemUnitPrice(
  item: CartItem,
  newQty: number,
  priceTiers: PriceTier[]
): { unitPrice: number; needsQuote: boolean } {
  const garmentUnit = getProductUnitPrice(item.product.costo, newQty, priceTiers);
  const techniques = item.customization_snapshot?.selected_techniques ?? [];

  if (!techniques.length) {
    // Sin personalizar, o snapshot guardado antes de que existiera este
    // detalle -- se conserva la parte de técnica tal cual estaba (ya no
    // hay con qué recalcularla), solo se actualiza el producto.
    const oldGarmentUnit = getProductUnitPrice(item.product.costo, item.total_quantity || 1, priceTiers);
    const oldTechniqueTotal = Math.max(0, item.unit_price - oldGarmentUnit);
    return { unitPrice: garmentUnit + oldTechniqueTotal, needsQuote: false };
  }

  let techniqueTotal = 0;
  let needsQuote = false;
  for (const t of techniques) {
    const technique = item.technique?.id === t.technique_id ? item.technique : null;
    if (!technique) {
      // No es la técnica "primaria" guardada en el renglón (multi-técnica,
      // hoy deshabilitado en el personalizador) -- se respeta su precio ya
      // calculado, no se re-deriva a ciegas.
      techniqueTotal += t.unit_price ?? 0;
      if (t.unit_price == null) needsQuote = true;
      continue;
    }
    if (technique.pricing_type === "by_qty") {
      const price = findQtyPrice(technique, newQty);
      if (price === null) { needsQuote = true; continue; }
      techniqueTotal += price * item.num_elements;
    } else if (technique.pricing_type === "by_tintas") {
      const posiciones = item.num_logo_elements ?? 0;
      if (!t.tintas || posiciones === 0) { techniqueTotal += t.unit_price ?? 0; continue; }
      const price = findTintasPrice(technique, t.tintas, posiciones, newQty);
      if (price === null) { needsQuote = true; continue; }
      techniqueTotal += techniquePriceWithIva(price);
    } else if (technique.pricing_type === "by_size") {
      const sizes = Object.values(t.logo_sizes ?? {});
      if (!sizes.length) { techniqueTotal += t.unit_price ?? 0; continue; }
      let sum = 0;
      let algunoPorCotizar = false;
      for (const size of sizes) {
        const price = findSizePrice(technique, size, newQty);
        if (price === null) algunoPorCotizar = true;
        else sum += price;
      }
      if (algunoPorCotizar) { needsQuote = true; continue; }
      techniqueTotal += sum;
    } else {
      techniqueTotal += t.unit_price ?? 0;
    }
  }
  return { unitPrice: garmentUnit + techniqueTotal, needsQuote };
}
