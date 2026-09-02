// Encadena las transformaciones de imagen de "Opciones de diseño" en el
// orden correcto -- primero Eliminar fondo, DESPUÉS Cambiar color (así el
// recolor pinta solo la silueta ya aislada, no el fondo que se acaba de
// quitar; en el orden inverso el recolor pintaría el fondo también, para
// luego el flood-fill de removeBackground -basado en color- ya no poder
// distinguirlo del propio logo). Compartido entre el lienzo real
// (DesignElementView) y la Vista previa (PreviewModal), para que ambos
// muestren exactamente el mismo resultado. `null` = no hace falta
// procesar nada, el llamador debe usar el `src` original tal cual.
import { removeBackground } from "./removeBackground";
import { recolorImage } from "./recolorImage";
import type { DesignElement } from "./types";

export function needsLogoProcessing(element: Pick<DesignElement, "bgRemoved" | "recolor">): boolean {
  return !!element.bgRemoved || !!element.recolor;
}

export async function processLogoSrc(src: string, element: Pick<DesignElement, "bgRemoved" | "recolor">): Promise<string> {
  let out = src;
  if (element.bgRemoved) out = await removeBackground(out);
  if (element.recolor) out = await recolorImage(out, element.recolor);
  return out;
}
