// Eliminar fondo: reemplaza por transparencia todo pixel que se PAREZCA
// al color de fondo detectado, sin importar dónde esté -- no un modelo de
// IA, ni un recorte por forma. El mismo criterio que un chroma-key/color-
// key clásico.
//
// 1. El color de fondo se toma como el promedio de TODOS los pixeles del
//    borde (fila de arriba/abajo, columna izquierda/derecha) -- así no
//    depende de una sola esquina, que podría no ser representativa.
// 2. Cada pixel de la imagen (no solo los conectados al borde) se
//    transparenta si su distancia de color al fondo está dentro del
//    umbral -- así un hueco interno del mismo color (ej. el centro de un
//    anillo, o el interior de una "O"/"A") también se limpia, no solo el
//    fondo exterior. Antes se probó una versión con inundación (flood-
//    fill) solo desde el borde -- se descartó justo por esto: un hueco
//    interno NO conectado al borde se quedaba opaco, y "Cambiar color" lo
//    pintaba igual que el resto del logo, dando el efecto de "círculo
//    sólido" reportado en vez de la silueta real.
// 3. Borde suave: entre el umbral "duro" (transparente total) y 1.8× ese
//    umbral, el alfa baja gradualmente en vez de un corte de un solo
//    pixel -- evita el borde dentado típico de un color-key binario.
//
// Contrapartida aceptada (igual que cualquier chroma-key real): un color
// DENTRO del logo que por casualidad coincida con el color de fondo
// también se transparenta -- es el comportamiento esperado para "quitar
// el fondo", no un caso aparte que distinguir.
const cache = new Map<string, Promise<string>>();

const DEFAULT_TOLERANCE = 40;

export function removeBackground(src: string, tolerance = DEFAULT_TOLERANCE): Promise<string> {
  const key = `${src}::${tolerance}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("sin contexto 2d"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;
        const sampleBg = (x: number, y: number) => {
          const i = (y * w + x) * 4;
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
          count++;
        };
        for (let x = 0; x < w; x++) {
          sampleBg(x, 0);
          sampleBg(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          sampleBg(0, y);
          sampleBg(w - 1, y);
        }
        const bgR = count > 0 ? rSum / count : 255;
        const bgG = count > 0 ? gSum / count : 255;
        const bgB = count > 0 ? bSum / count : 255;

        const softEdge = tolerance * 1.8;
        for (let p = 0; p < data.length; p += 4) {
          const dr = data[p] - bgR;
          const dg = data[p + 1] - bgG;
          const db = data[p + 2] - bgB;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist <= tolerance) {
            data[p + 3] = 0;
          } else if (dist <= softEdge) {
            const t = (dist - tolerance) / (softEdge - tolerance);
            data[p + 3] = Math.round(data[p + 3] * t);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    img.onerror = () => reject(new Error("no se pudo cargar la imagen"));
    img.src = src;
  });

  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}
