// Recolor de silueta: reemplaza todo pixel NO transparente de la imagen
// por un color sólido único, preservando el canal alfa original -- el
// mismo criterio que "un color de tinta" en bordado/DTF (nunca una
// paleta por zona/canal). Vía canvas offscreen + composite "source-in"
// (dibuja la imagen para tener su alfa, luego rellena todo el canvas con
// el color -- "source-in" solo conserva el relleno donde ya había algo
// dibujado, es decir, exactamente la silueta). Cachea por (src, color)
// para no recalcular en cada render mientras el usuario ajusta otra cosa.
const cache = new Map<string, Promise<string>>();

export function recolorImage(src: string, color: string): Promise<string> {
  const key = `${src}::${color}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = new Promise<string>((resolve, reject) => {
    const img = new Image();
    // Los logos vienen de Storage público de Supabase (CORS abierto) o de
    // un blob: local recién subido -- crossOrigin nunca rompe ninguno de
    // los dos casos, y sin esto toDataURL lanzaría "tainted canvas" para
    // el primero.
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 1;
        canvas.height = img.naturalHeight || 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("sin contexto 2d"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    img.onerror = () => reject(new Error("no se pudo cargar la imagen"));
    img.src = src;
  });

  cache.set(key, promise);
  // Un fallo (canvas contaminado, red, etc.) no debe dejar la promesa
  // rechazada en caché para siempre bloqueando reintentos futuros.
  promise.catch(() => cache.delete(key));
  return promise;
}
