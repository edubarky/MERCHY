// Sugerencia (mejor esfuerzo) del número de tintas para Serigrafía /
// Tampografía a partir de los colores que trae el arte colocado. NO es
// exacto ni pretende serlo -- cuenta racimos de color después de
// cuantizar fuerte y descartar transparencias / casi-blanco. El usuario
// siempre puede corregir el número en el pop-up. Si algo falla (imagen
// con CORS, formato raro, canvas tainted) regresa null y el pop-up
// simplemente no sugiere nada.

const SAMPLE = 64; // lienzo de muestreo (px)
const QUANT = 48; // tamaño de "cubo" de color al cuantizar (0-255)
const MIN_SHARE = 0.02; // un color debe ocupar al menos 2% de los píxeles opacos
export const MAX_TINTAS = 8;

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // blob:/data: nunca necesitan crossOrigin (y ponérselo puede romper la
    // carga); para URLs remotas se intenta anónimo para no envenenar el
    // canvas.
    if (!src.startsWith("blob:") && !src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function contarColores(img: HTMLImageElement): number | null {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, SAMPLE, SAMPLE);
  ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
  } catch {
    return null; // canvas tainted
  }

  const buckets = new Map<string, number>();
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue; // transparente
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // casi-blanco: normalmente fondo, no una tinta
    if (r > 240 && g > 240 && b > 240) continue;
    opaque++;
    const key = `${Math.round(r / QUANT)}-${Math.round(g / QUANT)}-${Math.round(b / QUANT)}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  if (opaque === 0) return null;

  const distintos = Array.from(buckets.values()).filter((n) => n / opaque >= MIN_SHARE).length;
  return Math.min(MAX_TINTAS, Math.max(1, distintos));
}

/** Sugiere un número de tintas (1..MAX_TINTAS) a partir de las fuentes de
 * imagen de los logos colocados. null si no se puede estimar. */
export async function suggestInkCount(logoSrcs: string[]): Promise<number | null> {
  const srcs = logoSrcs.filter(Boolean);
  if (srcs.length === 0) return null;
  let best: number | null = null;
  for (const src of srcs) {
    try {
      const img = await cargarImagen(src);
      const n = contarColores(img);
      if (n !== null) best = best === null ? n : Math.max(best, n);
    } catch {
      // se ignora este logo
    }
  }
  return best;
}
