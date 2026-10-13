// Zoom automático por foto -- reemplaza el zoom fijo (GARMENT_ZOOM) que
// rompió Gorra Gabardina: esa foto no tiene la prenda centrada (gorra en
// ángulo, pegada al lado derecho del cuadro), así que un scale() fijo
// centrado en 50%/50% la empujaba fuera del lienzo por un lado mientras
// dejaba puro blanco del otro (ver charla 2026-10-13, "necesito que se
// vea"). Un margen uniforme no sirve para todo el catálogo -- cada foto
// trae su propia cantidad de margen Y su propio centro real.
//
// En vez de adivinar, se mide la foto misma: se detecta el recuadro real
// que ocupa la prenda (todo lo que no sea el color de fondo, muestreado de
// las 4 esquinas) y se calcula el zoom máximo que cabe sin que ese
// recuadro se salga del lienzo por NINGÚN lado, centrado en el centro
// real de la prenda (no en el centro geométrico de la foto). Una foto ya
// bien encuadrada simplemente no se amplía (scale nunca baja de 1).
export interface AutoFrame {
  scale: number;
  originXPct: number;
  originYPct: number;
}

const DEFAULT_FRAME: AutoFrame = { scale: 1, originXPct: 50, originYPct: 50 };

// Tope duro -- una detección ruidosa (ej. fondo no uniforme) nunca debe
// poder disparar un zoom absurdo.
const MAX_ZOOM = 1.6;
// Downscale para el análisis -- no hace falta leer la foto a resolución
// completa para encontrar su recuadro, y así el cálculo es casi
// instantáneo incluso en fotos de varios megapixeles.
const SAMPLE_SIZE = 140;
// Qué tan distinto de la esquina debe ser un pixel para contar como
// "prenda" y no "fondo" -- distancia euclidiana en RGB (0-441 posibles).
const COLOR_THRESHOLD = 28;
// Margen alrededor de la prenda detectada, como fracción de su propio
// tamaño -- para que no quede pegada al borde exacto del lienzo.
const PADDING_FRACTION = 0.08;

const cache = new Map<string, Promise<AutoFrame>>();

export function getAutoFrame(src: string): Promise<AutoFrame> {
  if (!cache.has(src)) cache.set(src, computeAutoFrame(src));
  return cache.get(src)!;
}

async function computeAutoFrame(src: string): Promise<AutoFrame> {
  try {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    const scaleDown = Math.min(1, SAMPLE_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scaleDown));
    const h = Math.max(1, Math.round(img.naturalHeight * scaleDown));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return DEFAULT_FRAME;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const corner = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const corners = [corner(0, 0), corner(w - 1, 0), corner(0, h - 1), corner(w - 1, h - 1)];
    const bg = [0, 1, 2].map((c) => corners.reduce((s, px) => s + px[c], 0) / corners.length);

    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const alpha = data[i + 3];
        if (alpha < 16) continue; // transparente -- no es la prenda
        const dist = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
        if (dist < COLOR_THRESHOLD) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX || maxY < minY) return DEFAULT_FRAME; // nada detectado -- no se inventa

    let x0 = minX / w, x1 = (maxX + 1) / w, y0 = minY / h, y1 = (maxY + 1) / h;
    const padX = ((x1 - x0) * PADDING_FRACTION) / 2;
    const padY = ((y1 - y0) * PADDING_FRACTION) / 2;
    x0 = Math.max(0, x0 - padX);
    x1 = Math.min(1, x1 + padX);
    y0 = Math.max(0, y0 - padY);
    y1 = Math.min(1, y1 + padY);

    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const halfW = (x1 - x0) / 2;
    const halfH = (y1 - y0) / 2;
    // Zoom máximo que cabe sin salirse del lienzo por ningún lado,
    // centrado en (cx, cy) -- nunca asume que la prenda está centrada.
    const sMaxX = halfW > 0 ? Math.min(cx, 1 - cx) / halfW : MAX_ZOOM;
    const sMaxY = halfH > 0 ? Math.min(cy, 1 - cy) / halfH : MAX_ZOOM;
    const scale = Math.min(Math.max(Math.min(sMaxX, sMaxY), 1), MAX_ZOOM);

    return { scale, originXPct: cx * 100, originYPct: cy * 100 };
  } catch {
    return DEFAULT_FRAME;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para medirla."));
    img.src = src;
  });
}
