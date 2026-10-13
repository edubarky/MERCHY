// Mide la foto real de cada vista para dos cosas a la vez:
//
// 1. naturalAspect -- el aspect ratio REAL de la foto (ancho/alto en
//    pixeles). Causa raíz real de "la prenda se ve chica" en Playera
//    Málaga/Gorra Gabardina (ver charla 2026-10-13): el lienzo usaba un
//    aspect ratio FIJO por eje (VIEW_ASSETS, calibrado contra el mockup
//    genérico viejo 418x484) compartido por TODO el catálogo. Una foto
//    real casi siempre tiene OTRA proporción (ej. cuadrada, 1:1) -- el
//    navegador la encoge para que quepa dentro del marco equivocado
//    (object-contain), dejando franjas de aire arriba/abajo o a los
//    lados aunque la prenda YA ocupe casi toda SU propia foto. Esto no es
//    "falta de zoom", es el marco mal proporcionado -- por eso el primer
//    intento (GARMENT_ZOOM fijo, luego el zoom "automático" de abajo) no
//    lo resolvía: no importa cuánto se agrande la imagen, un marco más
//    angosto que la foto siempre le deja aire en los otros dos lados.
//    PersonalizerClient usa naturalAspect directo (si ya se midió) en vez
//    de VIEW_ASSETS -- cero configuración por producto, cualquier foto
//    nueva se mide sola.
//
// 2. scale/originXPct/originYPct -- zoom adicional DENTRO de esa foto ya
//    bien encuadrada, para la prenda que todavía tenga margen real
//    (no por mal aspect ratio, sino porque la foto en sí trae espacio de
//    sobra alrededor). Con el aspect ratio corregido esto deja de ser la
//    causa principal, pero sigue sumando en fotos con mucho aire propio.
export interface AutoFrame {
  scale: number;
  originXPct: number;
  originYPct: number;
  naturalAspect: number | null;
}

const DEFAULT_FRAME: AutoFrame = { scale: 1, originXPct: 50, originYPct: 50, naturalAspect: null };

// Tope duro -- una detección ruidosa nunca debe poder disparar un zoom
// absurdo.
const MAX_ZOOM = 1.6;
// Downscale para el análisis -- no hace falta leer la foto a resolución
// completa para encontrar su recuadro, y así el cálculo es casi
// instantáneo incluso en fotos de varios megapixeles.
const SAMPLE_SIZE = 160;
// Alpha mínimo para contar como "prenda" en una foto con fondo transparente
// (recorte real, canal alfa limpio -- el caso más común y más confiable:
// nunca se confunde con sombras ni con un fondo casi del mismo color que
// la prenda).
const ALPHA_THRESHOLD = 128;
// Si casi ningún pixel es semi/transparente, la foto no trae recorte real
// (fondo sólido) -- se usa el plan B (distancia de color + textura local)
// en vez del canal alfa.
const MIN_TRANSPARENT_FRACTION = 0.02;
// Plan B: qué tan distinto del fondo debe ser un pixel para contar como
// "prenda" -- distancia euclidiana en RGB.
const COLOR_THRESHOLD = 16;
// Plan B: diferencia mínima contra el pixel vecino (derecha/abajo) para
// contar como "textura" -- agarra prendas claras que el color por sí solo
// no distingue de un fondo blanco.
const EDGE_THRESHOLD = 10;
// Margen alrededor de la prenda detectada, como fracción de su propio
// tamaño -- para que no quede pegada al borde exacto del lienzo.
const PADDING_FRACTION = 0.08;

const cache = new Map<string, Promise<AutoFrame>>();

export function getAutoFrame(src: string): Promise<AutoFrame> {
  if (!cache.has(src)) cache.set(src, computeAutoFrame(src));
  return cache.get(src)!;
}

async function computeAutoFrame(src: string): Promise<AutoFrame> {
  let naturalAspect: number | null = null;
  try {
    const img = await loadImage(src);
    naturalAspect = img.naturalWidth / img.naturalHeight;

    const canvas = document.createElement("canvas");
    const scaleDown = Math.min(1, SAMPLE_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scaleDown));
    const h = Math.max(1, Math.round(img.naturalHeight * scaleDown));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ...DEFAULT_FRAME, naturalAspect };
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    let transparentCount = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) transparentCount++;
    }
    const usesAlpha = transparentCount / (w * h) >= MIN_TRANSPARENT_FRACTION;

    let minX = w, minY = h, maxX = -1, maxY = -1;

    if (usesAlpha) {
      // Fondo recortado de verdad -- el canal alfa YA dice exactamente
      // dónde está la prenda, sin ambigüedad de color.
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] < ALPHA_THRESHOLD) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    } else {
      // Fondo sólido -- color de fondo muestreado de una franja delgada
      // en los 4 bordes (más robusto que solo las 4 esquinas). Un pixel
      // cuenta como "prenda" si su color ya se distingue del fondo, O si
      // difiere notoriamente de sus vecinos (costura/pliegue/sombra de
      // tela) -- esto último agarra una prenda clara cuyo color promedio
      // casi no se distingue de un fondo blanco.
      const pixelAt = (x: number, y: number) => {
        const i = (y * w + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
      };
      const borderPx: number[][] = [];
      for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 40))) {
        borderPx.push(pixelAt(x, 0), pixelAt(x, h - 1));
      }
      for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 40))) {
        borderPx.push(pixelAt(0, y), pixelAt(w - 1, y));
      }
      const bg = [0, 1, 2].map((c) => borderPx.reduce((s, px) => s + px[c], 0) / borderPx.length);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (data[i + 3] < 16) continue; // transparente -- no es la prenda
          const [r, g, b] = pixelAt(x, y);
          const colorDist = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
          let isForeground = colorDist >= COLOR_THRESHOLD;
          if (!isForeground && x < w - 1 && y < h - 1) {
            const right = pixelAt(x + 1, y);
            const below = pixelAt(x, y + 1);
            const edge = Math.max(
              Math.abs(r - right[0]) + Math.abs(g - right[1]) + Math.abs(b - right[2]),
              Math.abs(r - below[0]) + Math.abs(g - below[1]) + Math.abs(b - below[2])
            );
            isForeground = edge >= EDGE_THRESHOLD;
          }
          if (!isForeground) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return { ...DEFAULT_FRAME, naturalAspect }; // nada detectado -- no se inventa

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

    return { scale, originXPct: cx * 100, originYPct: cy * 100, naturalAspect };
  } catch {
    return { ...DEFAULT_FRAME, naturalAspect };
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
