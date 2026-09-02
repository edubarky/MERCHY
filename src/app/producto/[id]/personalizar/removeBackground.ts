// Eliminar fondo: inundación (flood-fill) desde los bordes de la imagen,
// no un recorte por forma ni un modelo de IA -- el mismo criterio que la
// herramienta "varita mágica" de cualquier editor de imágenes. Funciona
// bien para el caso real más común (un logo exportado/escaneado sobre un
// fondo de un solo color, casi siempre blanco); una foto con fondo
// complejo puede no limpiarse del todo, pero eso queda fuera de alcance
// sin un modelo de segmentación real.
//
// 1. El color de fondo se toma como el promedio de TODOS los pixeles del
//    borde (fila de arriba/abajo, columna izquierda/derecha) -- así no
//    depende de una sola esquina, que podría no ser representativa.
// 2. Inunda desde cada pixel del borde hacia adentro (pila explícita, no
//    recursión -- sin riesgo de desbordar el stack con imágenes grandes),
//    transparentando cada pixel cuya distancia de color al fondo esté
//    dentro del umbral, y solo esos -- una forma del mismo color que el
//    fondo pero que NO toca el borde (ej. una "O" blanca dentro del logo)
//    nunca se transparenta, porque la inundación nunca llega hasta ahí.
// 3. Borde suave: entre el umbral "duro" (transparente total) y 1.8× ese
//    umbral, el alfa baja gradualmente en vez de un corte de un solo
//    pixel -- evita el borde dentado típico de un flood-fill binario.
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
        const visited = new Uint8Array(w * h);
        const stack: number[] = [];

        const visit = (x: number, y: number) => {
          if (x < 0 || x >= w || y < 0 || y >= h) return;
          const idx = y * w + x;
          if (visited[idx]) return;
          const i = idx * 4;
          const dr = data[i] - bgR;
          const dg = data[i + 1] - bgG;
          const db = data[i + 2] - bgB;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist > softEdge) return; // no se parece al fondo -- pared, no avanza más por aquí
          visited[idx] = 1;
          if (dist <= tolerance) {
            data[i + 3] = 0;
          } else {
            const t = (dist - tolerance) / (softEdge - tolerance);
            data[i + 3] = Math.round(data[i + 3] * t);
          }
          stack.push(idx);
        };

        for (let x = 0; x < w; x++) {
          visit(x, 0);
          visit(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          visit(0, y);
          visit(w - 1, y);
        }
        while (stack.length > 0) {
          const idx = stack.pop()!;
          const x = idx % w;
          const y = (idx / w) | 0;
          visit(x + 1, y);
          visit(x - 1, y);
          visit(x, y + 1);
          visit(x, y - 1);
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
