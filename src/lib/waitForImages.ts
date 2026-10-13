// Espera a que las tipografías de la página terminen de cargar antes de
// capturar con html2canvas — sin esto, si el navegador todavía no las
// tenía listas (primera visita, caché fría, conexión lenta), html2canvas
// capturaba el texto con la fuente de repuesto del sistema -- texto
// amontonado y sin estilo en el PDF aunque en pantalla se viera bien
// (mismo criterio ya probado en ONPOINT, ver su propio waitForImages.ts).
export function waitForFonts(): Promise<void> {
  const fonts = (typeof document !== "undefined" ? (document as any).fonts : null) as FontFaceSet | undefined;
  if (!fonts?.ready) return Promise.resolve();
  return fonts.ready.then(() => undefined).catch(() => undefined);
}

// Espera a que todos los <img> dentro de un contenedor terminen de cargar
// antes de capturarlo con html2canvas — si no, una imagen que todavía no
// carga se captura en blanco/rota (race condition, no error visible).
//
// Una imagen que falla se oculta en vez de dejarla rota en el DOM --
// html2canvas, al clonar el documento, intenta leer sus píxeles igual y
// puede rechazar la captura completa por una sola imagen rota. Oculta
// (display:none) en vez de remove() para no desarmar el layout flex/grid
// alrededor. `naturalWidth === 0` cubre también el caso de una imagen que
// YA estaba rota (complete=true) antes de que esta función la revisara --
// el navegador marca complete=true tanto en éxito como en fallo.
export function waitForImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll("img"));
  const ocultarSiRota = (img: HTMLImageElement) => {
    if (img.naturalWidth === 0) img.style.display = "none";
  };
  return Promise.all(
    imgs.map((img) => {
      if (img.complete) {
        ocultarSiRota(img);
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve());
        img.addEventListener("error", () => {
          ocultarSiRota(img);
          resolve();
        });
      });
    })
  ).then(() => undefined);
}
