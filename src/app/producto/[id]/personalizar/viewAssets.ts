import type { ViewName } from "./types";

// Coordenadas extraídas directamente de los recuadros punteados originales
// (carpeta de diseño "Personalizador") — % relativo al propio viewBox de
// cada imagen, para que el área editable quede perfectamente alineada sin
// importar el tamaño de renderizado del canvas.
export interface ViewAsset {
  src: string;
  aspect: number; // width / height
  printArea: { xPct: number; yPct: number; widthPct: number; heightPct: number };
}

export const VIEW_ASSETS: Record<ViewName, ViewAsset> = {
  frente: {
    src: "/Home/PERSONALIZADOR/Group 1161.svg",
    aspect: 418 / 484,
    printArea: { xPct: (200 / 418) * 100, yPct: (86 / 484) * 100, widthPct: (124 / 418) * 100, heightPct: (88 / 484) * 100 },
  },
  reverso: {
    src: "/Home/PERSONALIZADOR/Group 1158.svg",
    aspect: 388 / 581,
    printArea: {
      xPct: (135.797 / 388) * 100,
      yPct: (59 / 581) * 100,
      widthPct: (124 / 388) * 100,
      heightPct: (46 / 581) * 100,
    },
  },
  izquierda: {
    src: "/Home/PERSONALIZADOR/Group 1159.svg",
    aspect: 384 / 556,
    printArea: {
      xPct: (180.657 / 384) * 100,
      yPct: (171.52 / 556) * 100,
      widthPct: (73.2085 / 384) * 100,
      heightPct: (28.4415 / 556) * 100,
    },
  },
  derecha: {
    src: "/Home/PERSONALIZADOR/Group 1160.svg",
    aspect: 383 / 578,
    printArea: {
      xPct: (126.967 / 383) * 100,
      yPct: (168.799 / 578) * 100,
      widthPct: (73 / 383) * 100,
      heightPct: (29 / 578) * 100,
    },
  },
  // "fundaHorizontal"/"fundaVertical" (ver ViewName): sin mockup genérico
  // propio -- src/printArea de aquí nunca se renderizan de todos modos
  // (ver la nota de PersonalizerClient sobre asset.src/asset.printArea),
  // así que reutilizan el SVG de frente solo para no dejar el campo
  // vacío. `aspect` sí es real -- tomado directo de las fotos reales de
  // la funda del Tapete de Yoga Minsk (848×335 horizontal, 335×848
  // vertical, la misma funda rotada 90°), único producto que usa estos
  // dos ejes hoy.
  fundaHorizontal: {
    src: "/Home/PERSONALIZADOR/Group 1161.svg",
    aspect: 848 / 335,
    printArea: { xPct: 20, yPct: 25, widthPct: 60, heightPct: 50 },
  },
  fundaVertical: {
    src: "/Home/PERSONALIZADOR/Group 1161.svg",
    aspect: 335 / 848,
    printArea: { xPct: 25, yPct: 20, widthPct: 50, heightPct: 60 },
  },
  // "bolsa"/"ligaFrente"/"ligaReverso" (ver ViewName): Set de ejercicio
  // Bor, único producto que los usa hoy -- `aspect` tomado directo de sus
  // fotos reales (BOLSA.png 1019×1031, casi cuadrada; "LIGA FRENTE.png"/
  // "LIGA REVERSO.png" 2063×284, una liga plana muy ancha). src/printArea
  // igual de inertes que en fundaHorizontal/fundaVertical arriba.
  bolsa: {
    src: "/Home/PERSONALIZADOR/Group 1161.svg",
    aspect: 1019 / 1031,
    printArea: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 },
  },
  ligaFrente: {
    src: "/Home/PERSONALIZADOR/Group 1161.svg",
    aspect: 2063 / 284,
    printArea: { xPct: 15, yPct: 30, widthPct: 70, heightPct: 40 },
  },
  ligaReverso: {
    src: "/Home/PERSONALIZADOR/Group 1161.svg",
    aspect: 2063 / 284,
    printArea: { xPct: 15, yPct: 30, widthPct: 70, heightPct: 40 },
  },
};