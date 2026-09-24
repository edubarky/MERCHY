"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import type {
  Product,
  ProductVariant,
  PriceTier,
  PrintTechnique,
  CartItem,
  CustomizationElement,
  PerColorCustomization,
  SelectedTechniqueDetail,
} from "@/types";
import {
  getProductUnitPrice,
  findQtyPrice,
  findTintasPrice,
  findSizePrice,
  roundUpToConfiguredSize,
  getElementRealCm,
  techniquePriceWithIva,
} from "@/lib/pricing";
import { useCart, productDraftCartItemId } from "@/lib/cart/CartContext";
import { useArtLibrary, type ArtAsset } from "@/lib/artLibrary/ArtLibraryContext";
import {
  VIEW_ORDER,
  VIEW_LABELS,
  emptyViewElements,
  normalizeGarmentColorName,
  GARMENT_COLORS,
  type ViewName,
  type DesignElement,
  type ViewElements,
  type GarmentColor,
  type ResolvedProductAssets,
} from "./types";
import { VIEW_ASSETS } from "./viewAssets";
import { getPrintArea, getApplicableViews, isGarmentProduct } from "./printAreas";
import DesignElementView, { DEFAULT_FONT_SIZE_PX, FONT_SIZE_MIN_PX, FONT_SIZE_MAX_PX } from "./DesignElementView";
import PrintAreaGuide from "./PrintAreaGuide";

import SelectionToolbar from "./SelectionToolbar";
import DesignOptionsPanel from "./DesignOptionsPanel";
import PrintTechniqueCards from "./PrintTechniqueCards";
import TechniqueDetailCard from "./TechniqueDetailCard";
import TechniqueModal, { TechniqueConfirmedRow } from "./TechniqueModal";
import PrecioDesglose from "./PrecioDesglose";
import PreviewModal from "./PreviewModal";
import {
  TextToolIcon,
  ImageToolIcon,
  LayersIcon,
  UndoIcon,
  RedoIcon,
  SaveIcon,
  ArrowRightIcon,
  FrenteTabIcon,
  ReversoTabIcon,
  IzquierdaTabIcon,
  DerechaTabIcon,
  FundaTabIcon,
  FrentePrendaTabIcon,
  ReversoPrendaTabIcon,
  IzquierdaPrendaTabIcon,
  DerechaPrendaTabIcon,
  EyeIcon,

} from "./Icons";

// Qué ícono le toca a cada pestaña de eje -- ver el comentario junto a
// estos componentes en Icons.tsx. Dos sets: uno de silueta de prenda real
// (para el catálogo de ropa, pedido explícito -- "en lo de prendas...
// iconos referentes a ellas") y uno de orientación genérico (para
// cualquier otro producto, ej. Tapete de Yoga Minsk, donde una silueta de
// playera no tiene sentido). Los ejes de funda/bolsa/liga son iguales en
// los dos -- nunca son un costado de prenda: "bolsa" reusa el ícono de
// bolsa (FundaTabIcon, mismo concepto -- una bolsa con cordón), "liga"
// reusa el lenguaje de plano/plano-con-flecha-de-giro ya construido para
// Frente/Reverso genéricos (una liga plana también tiene un frente y un
// reverso sin abertura que dibujar distinto).
const VIEW_TAB_ICON: Record<ViewName, typeof FrenteTabIcon> = {
  frente: FrenteTabIcon,
  reverso: ReversoTabIcon,
  izquierda: IzquierdaTabIcon,
  derecha: DerechaTabIcon,
  fundaHorizontal: FundaTabIcon,
  fundaVertical: FundaTabIcon,
  bolsa: FundaTabIcon,
  ligaFrente: FrenteTabIcon,
  ligaReverso: ReversoTabIcon,
};
const VIEW_TAB_ICON_GARMENT: Record<ViewName, typeof FrenteTabIcon> = {
  frente: FrentePrendaTabIcon,
  reverso: ReversoPrendaTabIcon,
  izquierda: IzquierdaPrendaTabIcon,
  derecha: DerechaPrendaTabIcon,
  fundaHorizontal: FundaTabIcon,
  fundaVertical: FundaTabIcon,
  bolsa: FundaTabIcon,
  ligaFrente: FrenteTabIcon,
  ligaReverso: ReversoTabIcon,
};

// Ejes que se agrupan bajo UNA sola pestaña visual con un toggle sutil
// debajo (ver tabGroups/groupOrientation en el componente) en vez de
// aparecer cada uno como su propia pestaña suelta arriba -- mismo
// mecanismo reusado para cualquier accesorio/componente con más de una
// orientación/lado real: Funda (Horizontal/Vertical, Tapete de Yoga
// Minsk), Liga (Frente/Reverso, Set de ejercicio Bor). Un producto que
// solo ofrece UNO de los ejes de un grupo (ej. Tapete Century, solo
// fundaVertical) sigue viéndose como una pestaña plana normal -- el
// toggle solo aparece cuando applicableViews trae los 2+ ejes del mismo
// grupo (ver activeGroupViews más abajo). Agregar un componente nuevo
// con más de una orientación real es agregar una entrada aquí, no
// duplicar este mecanismo entero.
const VIEW_GROUP_DEFS: { key: string; label: string; views: ViewName[]; subLabel: (v: ViewName) => string }[] = [
  {
    key: "funda",
    label: "Funda",
    views: ["fundaHorizontal", "fundaVertical"],
    subLabel: (v) => (v === "fundaHorizontal" ? "Horizontal" : "Vertical"),
  },
  {
    key: "liga",
    label: "Liga",
    views: ["ligaFrente", "ligaReverso"],
    subLabel: (v) => (v === "ligaFrente" ? "Frente" : "Reverso"),
  },
];

// Regla general vigente (pedido explícito): solo se puede elegir UNA
// técnica de impresión por cotización a la vez. La lógica de selección
// MÚLTIPLE se deja completa y funcionando debajo de esta bandera --
// selectedTechniqueIds sigue siendo un arreglo, techniqueResults/
// logosByView/el resumen del carrito ya saben sumar varias técnicas a la
// vez, TechniqueDetailCard ya sabe mostrar varias tarjetas apiladas --
// nada de eso se tocó ni se borró. Reactivar el multi-select más
// adelante ("por si nos llegan a solicitar ese cambio") es cambiar este
// único valor a `true`, no reconstruir la selección múltiple desde cero.
const ALLOW_MULTIPLE_TECHNIQUES = false;

interface Props {
  product: Product & { variants: ProductVariant[] };
  priceTiers: PriceTier[];
  techniques: PrintTechnique[];
  resolvedAssets: ResolvedProductAssets;
  // El color de la prenda ya se eligió en la página del producto (ver
  // ProductDetail.tsx) -- este es el id de esa variante, pasado por
  // page.tsx vía ?variant=. El Personalizador NUNCA vuelve a mostrar el
  // selector completo de los 6 colores: solo carga los ejes de este color
  // específico (o de la lista acotada de multicolorVariantIds, ver abajo).
  // null cuando no llegó ninguno (ej. un link viejo sin el query param) --
  // en ese caso cae al mismo comportamiento de siempre (primera variante
  // activa).
  initialVariantId: string | null;
  // Solo presente cuando el usuario activó "Multicolor" en la página del
  // producto Y seleccionó MÁS de un color (ver ProductDetail.tsx / page.tsx
  // ?colors=). Cuando llega con 2+ ids reales de este producto, el
  // Personalizador muestra una barra para alternar ÚNICAMENTE entre esos
  // colores -- nunca los 6. null (Multicolor apagado, o solo un color
  // elegido) significa "sin barra", igual que el comportamiento de antes.
  multicolorVariantIds: string[] | null;
  // La cantidad que el cliente ya eligió en "2. Selecciona Cantidad" de la
  // ficha del producto (ver ProductDetail.tsx / page.tsx ?qty=). El
  // Personalizador arranca con esa misma cantidad -- antes siempre volvía
  // a 1, lo que además dejaba el precio por tramos de cada técnica
  // desincronizado del que el cliente ya había visto. null (link viejo/sin
  // el query param, o un valor inválido) -> 1, mismo comportamiento de
  // siempre.
  initialQuantity: number | null;
  // El cliente eligió "Distinto por color" en la pregunta de la ficha
  // (ver ProductDetail.tsx / page.tsx ?porColor=1, charla 2026-09-19).
  // Cambia `elements`/`techniqueTintas`/history de un solo diseño
  // compartido a uno por color (ver SHARED_KEY/designKey en el
  // componente) -- false (default) es el comportamiento de siempre.
  distintoPorColor: boolean;
}

// Clave de diseño cuando "Mismo diseño" está activo (o el producto no es
// multicolor) -- un solo diseño compartido, exactamente el
// comportamiento de siempre. Con "Distinto por color" la clave real es
// el variant_id de cada color.
const SHARED_KEY = "__shared__";

// Migra un `elements` guardado ANTES de "Distinto por color" (charla
// 2026-09-19): en ese entonces era un ViewElements plano (llaves = nombres
// de eje, ej. "frente"), no un diccionario por clave de diseño -- se
// envuelve en SHARED_KEY en vez de descartarlo. Usado por la restauración
// de ?editar= (renglón ya guardado en el carrito, ver customization_
// snapshot.editor_state) -- un renglón guardado antes de este cambio
// puede traer la forma vieja.
function migrateElementsShape(raw: unknown): Record<string, ViewElements> {
  const obj = raw as Record<string, unknown> | null | undefined;
  if (obj && !(SHARED_KEY in obj) && VIEW_ORDER.some((v) => v in obj)) {
    return { [SHARED_KEY]: obj as unknown as ViewElements };
  }
  return (obj as Record<string, ViewElements>) ?? { [SHARED_KEY]: emptyViewElements() };
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Ya NO hay borrador local en localStorage (ver charla 2026-09-22: "el
// carrito pasa a ser el único lugar donde vive cualquier borrador") --
// "Guardar"/"Siguiente"/cerrar la página guardan directo en un renglón
// real del carrito (ver persistToCart en el componente). Este tipo se
// queda porque sigue siendo la forma exacta de
// customization_snapshot.editor_state (ver buildCartItem), para que
// "Editar" desde el carrito pueda reabrir el lienzo EXACTO.
interface PersonalizerDraft {
  // Diccionario por "clave de diseño" (SHARED_KEY en modo Mismo diseño, o
  // variant_id por color en modo Distinto por color) -- ver designKey en
  // el componente. Un renglón guardado antes de este cambio (un solo
  // ViewElements plano) se migra en vez de descartarse, ver
  // migrateElementsShape.
  elements: Record<string, ViewElements>;
  selectedTechniqueIds: string[];
  // Con "Distinto por color", la llave deja de ser solo technique.id --
  // pasa a ser `${designKey}:${technique.id}` (ver tintasKey en el
  // componente), para que la cuenta de tintas no colisione entre
  // colores. Con "Mismo diseño" sigue siendo technique.id tal cual, sin
  // cambio de forma.
  techniqueTintas: Record<string, string>;
  techniqueLogoSizeCm: Record<string, Record<string, { largo: string; alto: string }>>;
  groupOrientation: Partial<Record<string, ViewName>>;
}

type EditorState = PersonalizerDraft;

// Reads an image's real natural pixel dimensions — the source of truth for
// sizing a newly-placed logo's box to its own actual aspect ratio (see
// placeAsset). Object URLs (what every renderable asset's `src` is) decode
// from memory, so this resolves essentially instantly — no visible delay.
// Resolves null on failure so the caller can fall back.
function loadImageNaturalSizePx(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.naturalWidth > 0 && img.naturalHeight > 0 ? { width: img.naturalWidth, height: img.naturalHeight } : null);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function ToolDockButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-[0_8px_20px_rgba(87,224,217,0.35)] ${
        active ? "bg-primary text-white" : "bg-white text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function PersonalizerClient({
  product,
  priceTiers,
  techniques,
  resolvedAssets,
  initialVariantId,
  multicolorVariantIds,
  initialQuantity,
  distintoPorColor,
}: Props) {
  const router = useRouter();
  // "frente" es el default de siempre, pero deja de ser válido para un
  // producto cuyos ejes ni siquiera incluyen "frente" (ej. Set de
  // ejercicio Bor: solo bolsa/ligaFrente/ligaReverso) -- inicializador
  // perezoso que arranca en el primer eje real de ESTE producto en vez
  // de un literal fijo, para no arrancar en una pestaña que no existe.
  const [activeView, setActiveView] = useState<ViewName>(() => getApplicableViews(product.name)[0] ?? "frente");
  const [filesTabView, setFilesTabView] = useState<ViewName>(() => getApplicableViews(product.name)[0] ?? "frente");
  // Qué eje usar dentro de cada pestaña AGRUPADA (ver tabGroups abajo) --
  // pedido explícito: la pestaña de arriba muestra un solo nombre por
  // grupo ("Funda", "Liga"), no cada orientación/lado suelto como pestaña
  // aparte, y el eje real se elige con un control aparte, sutil, debajo.
  // Recuerda la última elección de cada grupo (clave = group.key) en vez
  // de resetear siempre a la misma; un grupo sin elección guardada cae al
  // primer eje de ese grupo (ver tabGroups.map más abajo).
  const [groupOrientation, setGroupOrientation] = useState<Partial<Record<string, ViewName>>>({});
  // Diccionario por "clave de diseño" (ver SHARED_KEY/designKey más abajo)
  // -- con "Mismo diseño" (default) todo vive bajo SHARED_KEY, idéntico en
  // los hechos al ViewElements plano de siempre. Con "Distinto por color"
  // cada variant_id tiene su propio ViewElements independiente.
  const [elements, setElements] = useState<Record<string, ViewElements>>({ [SHARED_KEY]: emptyViewElements() });
  // Historial de undo/redo POR clave de diseño -- cambiar de color en modo
  // "Distinto por color" no debe permitir deshacer hacia el diseño de otro
  // color (ver commit()/undo()/redo() más abajo).
  const [historyByKey, setHistoryByKey] = useState<Record<string, ViewElements[]>>({ [SHARED_KEY]: [emptyViewElements()] });
  const [historyIndexByKey, setHistoryIndexByKey] = useState<Record<string, number>>({ [SHARED_KEY]: 0 });
  // Multi-selección (charla 2026-09-22: "seleccionar varios logos con
  // shift + click"). `selectedId` se sigue derivando aquí mismo (null
  // salvo que haya EXACTO un elemento seleccionado) -- todo lo que ya
  // dependía de un solo id (SelectionToolbar, DesignOptionsPanel, el
  // Moveable interactivo con manijas de mouse) sigue funcionando igual
  // sin tocarlo, y automáticamente se oculta en cuanto hay 2+ (nunca se
  // implementó arrastre/rotación de grupo con el mouse -- fuera de
  // alcance de este pedido, que solo pide seleccionar y escalar con
  // Shift+flecha). selectOnly reemplaza cada `setSelectedId` de antes
  // (mismo comportamiento: un clic normal siempre reduce la selección a
  // un solo elemento); toggleSelect es nuevo, solo lo usa el
  // Shift+clic en el lienzo.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
  function selectOnly(id: string | null) {
    setSelectedIds(id ? new Set([id]) : new Set());
  }
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  // "Opciones de diseño" (rotar/girar/cambiar color/ajustes de un logo) --
  // pedido explícito: el usuario debe ver la prenda completa junto con el
  // logo MIENTRAS edita. Ni un overlay flotando encima del lienzo ni
  // empujarlo hacia abajo cumplen eso (ambos ya probados y rechazados) --
  // el panel real vive en el sidebar derecho (nunca toca el tamaño/
  // posición del lienzo), controlado desde aquí para poder cerrarse solo
  // al cambiar de elemento seleccionado y para el click-outside de abajo.
  const [designOptionsOpen, setDesignOptionsOpen] = useState(false);
  const designOptionsButtonRef = useRef<HTMLDivElement>(null);
  const designOptionsPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDesignOptionsOpen(false);
  }, [selectedId]);

  useEffect(() => {
    if (!designOptionsOpen) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      const insideButton = designOptionsButtonRef.current?.contains(target);
      const insidePanel = designOptionsPanelRef.current?.contains(target);
      if (!insideButton && !insidePanel) setDesignOptionsOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [designOptionsOpen]);
  // Drag-over highlight while a file is dragged over the canvas — a ref
  // counter (not a plain boolean) because dragenter/dragleave fire once
  // per child element the pointer crosses, not just for the container as
  // a whole; without counting, moving over the product photo/an existing
  // design element inside the canvas would fire a spurious dragleave and
  // flicker the highlight off mid-drag.
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const dragCounterRef = useRef(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  // Selección múltiple: el usuario puede activar varias técnicas a la vez
  // (ej. DTF Textil + Bordado), cada una suma su propio precio por
  // separado. Cada técnica seleccionada pide su propio parámetro (ver
  // PrintTechnique.pricing_type) — nunca se inventa un valor por defecto
  // que no haya escrito el usuario. Ambos guardan texto crudo tal cual lo
  // escribe (no number), igual que cualquier otro <input> controlado de
  // este archivo — se parsean solo al calcular el precio. "Posiciones" ya
  // NO es un campo que el usuario escribe -- se deriva en vivo de en qué
  // ejes (frente/reverso/izquierda/derecha) hay elementos colocados (ver
  // activePositionLabels más abajo), así que no necesita su propio estado.
  const [selectedTechniqueIds, setSelectedTechniqueIds] = useState<string[]>([]);
  // Técnica cuyo pop-up de "elegir/editar" está abierto (solo by_tintas
  // por ahora -- ver TechniqueModal). null = ningún pop-up.
  const [modalTechniqueId, setModalTechniqueId] = useState<string | null>(null);
  const [techniqueTintas, setTechniqueTintas] = useState<Record<string, string>>({});
  // Medida por LOGO, no una sola compartida por técnica: técnica -> id de
  // elemento -> {largo, alto}. Se agrupan visualmente por posición
  // (Frente/Reverso/Izquierda/Derecha) en la tarjeta, con un panel propio
  // por cada logo de esa posición -- pedido explícito: "si el usuario
  // agregó 2 logos en la parte de enfrente, ahí va 2 y se desglosan 2
  // paneles donde se va a especificar las medidas de largo y ancho".
  const [techniqueLogoSizeCm, setTechniqueLogoSizeCm] = useState<Record<string, Record<string, { largo: string; alto: string }>>>(
    {}
  );
  // El stepper se había quitado de "Resumen del pedido" por pedido
  // explícito -- pero regresa aquí: los tramos de precio por cantidad de
  // la tabla de cada técnica (ej. DTF Textil: 1-9/10-49/50-99/...) dependen
  // de esta cantidad real de PRENDAS del pedido (confirmado explícitamente
  // con el usuario), no del número de logos -- sin un control editable
  // aquí, esos tramos nunca pueden bajar de precio, que es justo el bug
  // reportado ("si el usuario agrega más piezas el costo baja"). Arranca
  // en `initialQuantity` (la cantidad que el cliente ya eligió en la ficha
  // del producto) en vez de siempre en 1 -- así el precio por tramos
  // coincide desde el inicio con lo que ya vio ahí.
  const [quantity, setQuantity] = useState(initialQuantity ?? 1);
  // Input SIEMPRE visible y editable (no click-to-edit, se reportó como
  // "muy complicado") -- un cuadro de texto normal entre los botones -/+,
  // igual que cualquier campo de cantidad estándar. qtyDraft es el texto
  // crudo que se ve mientras se escribe (para poder borrar y volver a
  // teclear sin que se resetee a cada tecla); se confirma a `quantity` en
  // cada cambio válido y también al perder el foco (por si queda vacío).
  const [qtyDraft, setQtyDraft] = useState(String(initialQuantity ?? 1));
  const [zCounter, setZCounter] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  // Drives the discreet "fuera de la superficie del producto" notice — no
  // print-area rectangle involved anymore, this just tracks whether the
  // selected element's own bounding box currently sits fully inside the
  // canvas (the full product photo). See DesignElementView's
  // isWithinCanvas(); the notice shows only while true is false and
  // something is selected.
  const [interactionInBounds, setInteractionInBounds] = useState(true);
  // Se pone en true recién después de que el efecto de restaurar el
  // borrador (ver más abajo) ya corrió una vez -- el efecto de GUARDAR usa
  // esto para no disparar en el primer render con los valores todavía
  // vacíos de siempre y sobreescribir/borrar un borrador real que apenas
  // se acaba de leer de localStorage.
  const [draftReady, setDraftReady] = useState(false);

  // El botón/popover de carrito interno de este panel se eliminó -- el
  // carrito ahora vive únicamente en PublicHeader (barra superior, ver
  // page.tsx), que ya usa este mismo CartContext, así que el conteo/pulso
  // sigue siendo el carrito real de la plataforma, no uno nuevo. `addItem`
  // es lo único que este componente todavía necesita del contexto.
  const { addItem, upsertItem, upsertItemSync, removeItem, items: cartItems, hydrated: cartHydrated } = useCart();
  // ?editar=<id> -- "Editar" desde el carrito de una línea YA
  // personalizada (ver carrito/page.tsx) -- distinto del renglón "en
  // curso" de arriba (draftCartItemId, id fijo, todavía sin confirmar).
  // Mientras esto tenga valor, "Siguiente" reemplaza ESA misma línea del
  // carrito en vez de crear una nueva (ver handleAddToCart) y vuelve al
  // carrito en vez de a /checkout.
  const editarCartItemId = useSearchParams().get("editar");
  // Mismo id que ya viene usando ProductDetail (ver productDraftCartItemId)
  // desde que el cliente eligió cantidad/color/talla en la ficha -- este
  // Personalizador sigue actualizando ESE MISMO renglón (nunca uno nuevo)
  // a medida que agrega diseño, así que nunca aparece duplicado en el
  // carrito. Nunca choca con el id de un renglón ya confirmado (ver
  // handleAddToCart, que usa uid() para ese).
  const draftCartItemId = productDraftCartItemId(product.id);
  // Colores + desglose de tallas reales ya guardados por ProductDetail
  // (pasos "1. Selecciona Color"/"2. Selecciona Cantidad") en este mismo
  // renglón -- editarCartItemId si se está editando una línea ya
  // confirmada, si no draftCartItemId (el renglón "en curso" que
  // ProductDetail ya viene sincronizando). El Personalizador (pasos 3-4)
  // NUNCA debe reconstruir esto desde cero: antes recreaba `variants` con
  // un solo color activo y `sizes_breakdown: {}` fijo, así que en cuanto
  // el cliente tocaba cualquier cosa aquí (incluso antes de poner un
  // logo) se le borraban las tallas y, en Multicolor, se le colapsaban
  // los demás colores a uno solo (ver charla 2026-09-16, bug real
  // reportado). Solo si no hay NINGÚN renglón previo (ej. un link directo
  // al Personalizador sin haber pasado por la ficha) cae al color activo
  // como respaldo, sin desglose de tallas por no haber de dónde sacarlo.
  // Declarado temprano (no junto a buildCartItem, donde vivía antes) para
  // que colorQty (ver más abajo) lo pueda usar desde el bloque de precio
  // en vivo, que se calcula antes que buildCartItem en el orden del
  // componente.
  const sourceVariantsItem = cartItems.find((i) => i.id === (editarCartItemId ?? draftCartItemId));
  const { addAsset } = useArtLibrary();

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // El/los color(es) de la prenda YA se eligieron en la página del producto
  // (ver ProductDetail.tsx's "1. Selecciona Color" + el switch Multicolor)
  // — el Personalizador nunca vuelve a mostrar el selector completo de los
  // 6 colores. Dos casos, controlados por si `multicolorVariantIds` llegó
  // (ver Props):
  //  - Un solo color (Multicolor apagado, o encendido pero con solo un
  //    color tocado): la prenda queda completamente fija durante toda la
  //    sesión, igual que antes -- ninguna barra se dibuja.
  //  - Varios colores + Multicolor activo: SÍ aparece una barra, pero
  //    ÚNICAMENTE con esos colores ya elegidos (nunca los 6) -- sirve para
  //    alternar entre ellos, no para elegir uno nuevo. `activeVariantId`
  //    es lo único que cambia al tocar la barra; `elements` (los diseños
  //    colocados) nunca se tocan, así el arte se conserva igual en
  //    cualquiera de los colores.
  // `initialVariantId` (siempre presente, ver Props) decide cuál de los
  // colores se muestra primero en ambos casos.
  const barVariants = (multicolorVariantIds ?? [])
    .map((id) => product.variants.find((v) => v.id === id))
    .filter((v): v is ProductVariant => !!v)
    // Orden canónico -- no el orden en que el usuario los fue tocando en
    // la página del producto, para que la barra siempre se lea igual.
    // GARMENT_COLORS ya no es "la lista de colores válidos" (ver types.ts
    // -- GarmentColor es libre ahora, cualquier producto puede tener
    // colores propios que nunca estuvieron ahí), solo un puñado de
    // colores comunes con una posición preferida; cualquier otro color va
    // después, ordenado alfabéticamente entre sí para que el orden sea
    // estable en vez de colapsar todos juntos.
    .sort((a, b) => {
      const ca = normalizeGarmentColorName(a.color_name) ?? "";
      const cb = normalizeGarmentColorName(b.color_name) ?? "";
      const ia = GARMENT_COLORS.indexOf(ca);
      const ib = GARMENT_COLORS.indexOf(cb);
      if (ia === -1 && ib === -1) return ca.localeCompare(cb);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  const showColorBar = barVariants.length > 1;

  const fallbackVariant = product.variants.find((v) => v.active) ?? product.variants[0] ?? null;
  const [activeVariantId, setActiveVariantId] = useState<string | null>(initialVariantId ?? fallbackVariant?.id ?? null);
  const activeVariant = product.variants.find((v) => v.id === activeVariantId) ?? fallbackVariant;
  const garmentColor: GarmentColor = (activeVariant && normalizeGarmentColorName(activeVariant.color_name)) ?? "blanco";

  // "Clave de diseño" -- con "Mismo diseño" (default) siempre SHARED_KEY,
  // sin importar qué color esté activo en la barra: cambiar de color ahí
  // sigue siendo puramente visual, nunca toca `elements` (comportamiento
  // de siempre). Con "Distinto por color" SÍ importa: cada color edita su
  // propio diseño independiente.
  const designKey = distintoPorColor ? (activeVariantId ?? SHARED_KEY) : SHARED_KEY;
  const currentElements = elements[designKey] ?? emptyViewElements();
  const currentHistory = historyByKey[designKey] ?? [emptyViewElements()];
  const currentHistoryIndex = historyIndexByKey[designKey] ?? 0;
  // Ver el comentario de techniqueTintas en PersonalizerDraft -- con
  // "Distinto por color" la llave real es compuesta para que la cuenta de
  // tintas de un color nunca pise la de otro.
  function tintasKeyFor(dk: string, techniqueId: string) {
    return distintoPorColor ? `${dk}:${techniqueId}` : techniqueId;
  }
  function tintasKey(techniqueId: string) {
    return tintasKeyFor(designKey, techniqueId);
  }
  // Cantidad de ESTE color específico -- de sourceVariantsItem (el
  // renglón real del carrito, ya sincronizado por ProductDetail, ver más
  // abajo) si existe; si no (ej. link directo sin pasar por la ficha),
  // cae a la cantidad total repartida entre los colores de la barra a
  // partes iguales, mejor esfuerzo mientras no haya de dónde sacar el
  // reparto real.
  function colorQty(variantId: string): number {
    const fromCart = sourceVariantsItem?.variants.find((v) => v.variant_id === variantId)?.qty;
    if (fromCart != null) return fromCart;
    return barVariants.length ? Math.round(quantity / barVariants.length) : quantity;
  }

  // designKey viaja junto con el historial -- undo/redo/commit siempre
  // deben operar sobre la clave de diseño que estaba activa en el
  // render MÁS RECIENTE al momento del clic/llamada, nunca una vieja
  // cerrada por un useCallback con deps vacías.
  const historyRef = useRef({ history: currentHistory, historyIndex: currentHistoryIndex, designKey });
  historyRef.current = { history: currentHistory, historyIndex: currentHistoryIndex, designKey };
  // Mismo patrón que historyRef -- addElement/updateElement/etc. leen esto
  // (nunca el `elements`/`designKey` cerrados en el render) para no perder
  // un elemento. Bug real confirmado: dos subidas rápidas seguidas a la
  // MISMA vista (ej. 2 logos en Frente) son asíncronas (addAsset sube a
  // Supabase antes de poder colocarse) -- si la segunda `addElement`
  // corría con el `elements` capturado en un render viejo (antes de que
  // la primera terminara de re-renderizar), pisaba el arreglo y el primer
  // logo desaparecía.
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const designKeyRef = useRef(designKey);
  designKeyRef.current = designKey;
  // Portapapeles interno para Ctrl/Cmd+C + Ctrl/Cmd+V sobre el elemento
  // seleccionado (logo o texto) -- pedido explícito para que duplicar sea
  // tan fácil como en cualquier editor real. Guarda una copia de los datos
  // del elemento en el momento del copy (no solo el id, porque el usuario
  // puede seguir editándolo o incluso borrarlo antes de pegar). Vive fuera
  // de React state a propósito: copiar/pegar no debe generar historial de
  // undo por sí solo, solo el pegado (que sí crea un elemento real).
  const copiedElementRef = useRef<DesignElement | null>(null);

  // No shared generic mockup fallback here on purpose: the Personalizador
  // must only ever show the actual selected product's own photography, per
  // explicit product decision — never a shirt illustration that could be
  // mistaken for a different product. VIEW_ASSETS is still used below for
  // canvas aspect-ratio only, never for its `src` or its `printArea` (print
  // area comes from printAreas.ts's per-product/per-view config now).
  function getViewSrc(view: ViewName, color: GarmentColor): string | null {
    return resolvedAssets[view][color] ?? null;
  }

  // Qué pestañas de eje mostrar en el canvas -- no todo el catálogo es una
  // prenda con cuatro costados (ver getApplicableViews). El resto del
  // catálogo sigue viendo los 4 de siempre, sin cambio de comportamiento.
  const applicableViews = getApplicableViews(product.name);
  const tabIconMap = isGarmentProduct(product.name) ? VIEW_TAB_ICON_GARMENT : VIEW_TAB_ICON;

  // Las pestañas que se MUESTRAN agrupan los ejes de VIEW_GROUP_DEFS
  // (Funda, Liga) en una sola pestaña visual -- pedido explícito ("solo
  // quiero la parte de Funda como estaba antes"). Cada eje que no
  // pertenece a ningún grupo sigue siendo su propia pestaña de siempre,
  // sin cambio (esto no afecta a ningún producto sin esos componentes).
  // El eje real que le toca a una pestaña agrupada lo decide
  // groupOrientation (ver el toggle debajo del canvas).
  const tabGroups: { key: string; label: string; icon: typeof FrenteTabIcon; views: ViewName[] }[] = [];
  for (const v of applicableViews) {
    const groupDef = VIEW_GROUP_DEFS.find((g) => g.views.includes(v));
    if (groupDef) {
      let group = tabGroups.find((g) => g.key === groupDef.key);
      if (!group) {
        group = { key: groupDef.key, label: groupDef.label, icon: tabIconMap[groupDef.views[0]], views: [] };
        tabGroups.push(group);
      }
      group.views.push(v);
    } else {
      tabGroups.push({ key: v, label: VIEW_LABELS[v], icon: tabIconMap[v], views: [v] });
    }
  }
  // El toggle (ver más abajo) solo tiene sentido cuando el producto de
  // verdad ofrece 2+ ejes del MISMO grupo que el eje activo -- un
  // producto con un solo eje de ese grupo (ej. Tapete Century, solo
  // "fundaVertical") nunca debe mostrar un toggle ofreciendo una segunda
  // opción que no existe.
  const activeGroupDef = VIEW_GROUP_DEFS.find((g) => g.views.includes(activeView));
  const activeGroupViews = activeGroupDef ? activeGroupDef.views.filter((v) => applicableViews.includes(v)) : [];
  const showGroupToggle = activeGroupViews.length > 1;

  const asset = VIEW_ASSETS[activeView];
  // Único eje que este Personalizador carga para la vista activa: el del
  // color ya elegido en la página del producto. No se resuelven ni cargan
  // los ejes de ningún otro color.
  const activeViewSrc = getViewSrc(activeView, garmentColor);
  const selectedElement = currentElements[activeView].find((e) => e.id === selectedId) ?? null;

  // Fresh selection always starts "in bounds" (it was just placed/spawned
  // validly) — only an active drag/resize/rotate on it can mark it out.
  useEffect(() => {
    setInteractionInBounds(true);
  }, [selectedId]);

  // Todas escriben sobre historyRef.current.designKey -- la clave de
  // diseño activa en el render más reciente, no la que estuviera cerrada
  // en este useCallback (deps vacías a propósito, mismo motivo de
  // siempre: el resto de handlers también los usan desde closures viejas).
  const commit = useCallback((next: ViewElements) => {
    const key = historyRef.current.designKey;
    setElements((prev) => ({ ...prev, [key]: next }));
    setHistoryByKey((prev) => {
      const truncated = (prev[key] ?? [emptyViewElements()]).slice(0, historyRef.current.historyIndex + 1);
      return { ...prev, [key]: [...truncated, next] };
    });
    setHistoryIndexByKey((prev) => ({ ...prev, [key]: historyRef.current.historyIndex + 1 }));
  }, []);

  const undo = useCallback(() => {
    const { history: h, historyIndex: idx, designKey: key } = historyRef.current;
    if (idx === 0) return;
    setHistoryIndexByKey((prev) => ({ ...prev, [key]: idx - 1 }));
    setElements((prev) => ({ ...prev, [key]: h[idx - 1] }));
    selectOnly(null);
  }, []);

  const redo = useCallback(() => {
    const { history: h, historyIndex: idx, designKey: key } = historyRef.current;
    if (idx >= h.length - 1) return;
    setHistoryIndexByKey((prev) => ({ ...prev, [key]: idx + 1 }));
    setElements((prev) => ({ ...prev, [key]: h[idx + 1] }));
    selectOnly(null);
  }, []);

  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < currentHistory.length - 1;

  const deleteElement = useCallback(
    (id: string) => {
      const next = { ...currentElements, [activeView]: currentElements[activeView].filter((e) => e.id !== id) };
      commit(next);
      selectOnly(null);
    },
    [currentElements, activeView, commit]
  );

  // Elimina TODOS los seleccionados a la vez (Suprimir/Backspace con una
  // multi-selección, ver charla 2026-09-22) -- deleteElement de arriba se
  // queda igual, la sigue usando el botón "Eliminar" de SelectionToolbar
  // (que solo se muestra con exactamente 1 seleccionado).
  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const next = { ...currentElements, [activeView]: currentElements[activeView].filter((e) => !selectedIds.has(e.id)) };
    commit(next);
    selectOnly(null);
  }, [currentElements, activeView, commit, selectedIds]);

  // Shift+ArrowRight/ArrowLeft grows/shrinks the currently selected element
  // — same keepRatio-preserving scaling react-moveable's own corner-drag
  // already does, just driven by keyboard instead of a mouse gesture. Text
  // scales via `fontSizePx` (DesignElementView's own auto-fit effect then
  // re-measures and resizes the box, exactly like a real corner drag ends
  // for text — see that file's onResizeEnd for the mouse equivalent); logos
  // scale `widthPct`/`heightPct` directly, both anchored on the element's
  // own current center so it grows/shrinks in place rather than drifting
  // toward a corner.
  const RESIZE_STEP_FACTOR = 1.06;
  const LOGO_MIN_PCT = 1;

  // Con 2+ seleccionados escala a TODOS a la vez (ver charla 2026-09-22)
  // -- cada uno alrededor de su PROPIO centro, igual que con 1 solo, así
  // que no se juntan ni se separan entre ellos, solo cada uno crece o
  // encoge en su lugar. Un solo `commit` al final (no un updateElement
  // por elemento): éste lee/escribe el mismo `elements[designKey]`
  // completo, así que llamarlo varias veces seguidas de forma síncrona
  // pisaría los cambios anteriores entre sí (cada llamada partiría del
  // mismo estado aún no actualizado por React).
  function resizeSelectedElementByKeyboard(direction: 1 | -1) {
    if (selectedIds.size === 0) return;
    const factor = direction === 1 ? RESIZE_STEP_FACTOR : 1 / RESIZE_STEP_FACTOR;
    const current = elementsRef.current[designKeyRef.current];
    const nextView = current[activeView].map((el) => {
      if (!selectedIds.has(el.id)) return el;
      if (el.type === "text") {
        const currentPx = el.fontSizePx ?? DEFAULT_FONT_SIZE_PX;
        const nextPx = Math.min(FONT_SIZE_MAX_PX, Math.max(FONT_SIZE_MIN_PX, currentPx * factor));
        return { ...el, fontSizePx: nextPx };
      }
      const centerXPct = el.xPct + el.widthPct / 2;
      const centerYPct = el.yPct + el.heightPct / 2;
      const nextWidthPct = Math.max(LOGO_MIN_PCT, el.widthPct * factor);
      const nextHeightPct = Math.max(LOGO_MIN_PCT, el.heightPct * factor);
      return {
        ...el,
        widthPct: nextWidthPct,
        heightPct: nextHeightPct,
        xPct: centerXPct - nextWidthPct / 2,
        yPct: centerYPct - nextHeightPct / 2,
      };
    });
    commit({ ...current, [activeView]: nextView });
  }

  // Flechas (sin Shift) mueven el elemento seleccionado un paso chico —
  // no existía ningún atajo de teclado para esto (ver charla 2026-09-10:
  // "no me deja moverlo con las flechas"). Mismo ancla-por-centro que el
  // resize de arriba, solo que aquí no hay que recalcular nada más que
  // xPct/yPct.
  const MOVE_STEP_PCT = 0.4;

  function moveSelectedElementByKeyboard(dxPct: number, dyPct: number) {
    if (selectedIds.size === 0) return;
    const current = elementsRef.current[designKeyRef.current];
    const nextView = current[activeView].map((el) =>
      selectedIds.has(el.id) ? { ...el, xPct: el.xPct + dxPct, yPct: el.yPct + dyPct } : el
    );
    commit({ ...current, [activeView]: nextView });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (ctrlOrCmd && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      const target = e.target as HTMLElement | null;
      const isEditableField =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      // Suprimir/Delete/Backspace deletes the currently selected element —
      // but never while the user is typing somewhere (text edit mode's own
      // <input> in DesignElementView, the quantity/size/color/etc. fields
      // in this toolbar) — there Backspace must keep deleting characters,
      // not the element. Checking the focused element covers every such
      // field generically, with no need to know about them individually.
      if (e.key === "Delete" || e.key === "Backspace") {
        if (isEditableField || selectedIds.size === 0) return;
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Shift+flecha resizes the selected element. This needs a NARROWER
      // guard than Delete/Backspace above: it must still be blocked while
      // literally typing the design's own text content (the type="text"
      // inline edit <input> in DesignElementView, or any future
      // contentEditable/textarea), where Shift+Arrow is a real text-
      // selection gesture — but it must NOT be blocked just because focus
      // happens to be sitting in an unrelated numeric field like the
      // toolbar's "Rotación" input (type="number", the only other input
      // this toolbar has besides the color swatch) — real reported bug:
      // clicking that field (or any non-text control) before pressing the
      // shortcut made it silently do nothing, since the broader
      // isEditableField check above treated every input the same way.
      const isTypingFreeText =
        !!target &&
        (target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          (target.tagName === "INPUT" && (target as HTMLInputElement).type === "text"));
      if (e.shiftKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        if (isTypingFreeText || selectedIds.size === 0) return;
        e.preventDefault();
        resizeSelectedElementByKeyboard(e.key === "ArrowRight" ? 1 : -1);
        return;
      }

      // Flecha sola (sin Shift) mueve el elemento seleccionado. Guardia
      // ANCHA (isEditableField, no isTypingFreeText) a propósito -- a
      // diferencia de Shift+flecha arriba, una flecha SOLA sobre el campo
      // "Rotación" (type="number") sí tiene un uso nativo real (subir/
      // bajar ese número), así que aquí NO se debe interceptar solo
      // porque el foco esté en cualquier campo de formulario.
      if (
        !e.shiftKey &&
        (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        if (isEditableField || selectedIds.size === 0) return;
        e.preventDefault();
        const dx = e.key === "ArrowLeft" ? -MOVE_STEP_PCT : e.key === "ArrowRight" ? MOVE_STEP_PCT : 0;
        const dy = e.key === "ArrowUp" ? -MOVE_STEP_PCT : e.key === "ArrowDown" ? MOVE_STEP_PCT : 0;
        moveSelectedElementByKeyboard(dx, dy);
        return;
      }

      // Ctrl/Cmd+C copia el elemento seleccionado a copiedElementRef; el
      // pegado real ocurre en el listener "paste" de abajo (mismo evento
      // nativo que ya maneja pegar una imagen del portapapeles del SO), no
      // aquí en el keydown de "v" -- así los dos flujos (pegar una imagen
      // externa vs. pegar un elemento copiado dentro del propio lienzo)
      // conviven en un solo lugar sin arriesgarse a disparar los dos a la
      // vez. Mismo criterio que Shift+flecha arriba: se ignora mientras se
      // esté escribiendo texto libre de verdad, pero SÍ actúa aunque el
      // foco esté en un campo numérico como "Rotación" -- ahí Ctrl+C no
      // tiene nada útil que copiar de todos modos.
      if (ctrlOrCmd && e.key.toLowerCase() === "c") {
        if (isTypingFreeText || !selectedId) return;
        const el = elementsRef.current[designKeyRef.current][activeView].find((item) => item.id === selectedId);
        if (el) {
          copiedElementRef.current = el;
          e.preventDefault();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, deleteSelected, selectedIds, selectedId, currentElements, activeView]);

  // Ctrl/Cmd+V hace dos cosas distintas con el mismo evento nativo "paste",
  // en este orden de prioridad: 1) si el portapapeles del SO trae una
  // imagen real (screenshot, archivo copiado de Finder), la coloca como
  // logo nuevo -- comportamiento original, intacto; 2) si no, y el usuario
  // copió un elemento del lienzo con Ctrl/Cmd+C (ver copiedElementRef +
  // onKeyDown arriba), pega una copia de ESE elemento -- duplicar así de
  // fácil era un pedido explícito ("que el usuario tenga facilidad... una
  // gran experiencia"). Mismo guard que el Shift+flecha: se ignora
  // mientras se esté escribiendo texto libre de verdad (el <input> de
  // edición de un texto del diseño, una futura textarea/contentEditable),
  // para no secuestrar un paste normal ahí; en cualquier otro punto de la
  // página (incluyendo con el foco en un campo numérico como "Rotación",
  // o sin foco en nada) actúa sobre el lienzo.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTypingFreeText =
        !!target &&
        (target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          (target.tagName === "INPUT" && (target as HTMLInputElement).type === "text"));
      if (isTypingFreeText) return;

      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === "file" && item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              placeUploadedFile(file);
            }
            return;
          }
        }
      }

      // Sin imagen real en el portapapeles del SO -- si el usuario copió un
      // elemento del propio lienzo con Ctrl/Cmd+C (ver onKeyDown arriba),
      // este es el Ctrl/Cmd+V que lo pega: una copia nueva en la vista
      // activa ahora mismo (puede ser otra distinta a la que tenía cuando
      // se copió), con su propio id y ligeramente desplazada para que no
      // quede exactamente encima del original.
      const copied = copiedElementRef.current;
      if (copied) {
        e.preventDefault();
        const z = zCounter + 1;
        setZCounter(z);
        addElement({
          ...copied,
          id: uid(),
          view: activeView,
          xPct: Math.min(copied.xPct + 4, 100 - copied.widthPct),
          yPct: Math.min(copied.yPct + 4, 100 - copied.heightPct),
          zIndex: z,
        });
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, zCounter]);

  function addElement(el: DesignElement) {
    const current = elementsRef.current[designKeyRef.current];
    const next = { ...current, [el.view]: [...current[el.view], el] };
    commit(next);
    selectOnly(el.id);
  }

  // Live in-bounds status while dragging/resizing/rotating the selected
  // element (see DesignElementView's onInteraction) — the guide itself is
  // always shown while something is selected (see `selectedElement` below);
  // this only controls whether it reads as "safe" (turquoise) or "fuera
  // del área" (coral).
  function handleElementInteraction(_active: boolean, inBounds: boolean) {
    setInteractionInBounds(inBounds);
  }

  function updateElement(id: string, patch: Partial<DesignElement>) {
    const current = elementsRef.current[designKeyRef.current];
    const next = { ...current, [activeView]: current[activeView].map((e) => (e.id === id ? { ...e, ...patch } : e)) };
    commit(next);
  }

  function duplicateElement(id: string) {
    const el = elementsRef.current[designKeyRef.current][activeView].find((e) => e.id === id);
    if (!el) return;
    const z = zCounter + 1;
    setZCounter(z);
    addElement({
      ...el,
      id: uid(),
      xPct: Math.min(el.xPct + 4, 100 - el.widthPct),
      yPct: Math.min(el.yPct + 4, 100 - el.heightPct),
      zIndex: z,
    });
  }

  function bringToFront(id: string) {
    const z = zCounter + 1;
    setZCounter(z);
    updateElement(id, { zIndex: z });
  }

  function sendToBack(id: string) {
    const minZ = Math.min(0, ...elementsRef.current[designKeyRef.current][activeView].map((e) => e.zIndex));
    updateElement(id, { zIndex: minZ - 1 });
  }

  // Places an already-registered "Mis artes" asset onto the active view as
  // a brand-new, independent instance (its own position/size/rotation) —
  // used both right after a fresh upload and when picking an existing
  // asset from the library. The asset itself (fileName/fileType/src) is
  // never duplicated, only referenced.
  //
  // The initial box is sized to the art's own real aspect ratio (see
  // loadImageNaturalSizePx below), fit inside the same max footprint the
  // print-area-based box used to occupy outright — same math as CSS
  // `object-fit: contain`, just applied to the element's own width/height
  // instead of only to how the <img> renders inside it. Without this, a
  // logo whose aspect ratio doesn't match the print area's own shape would
  // render letterboxed (via the `object-contain` on the <img> itself),
  // leaving empty space inside the box that Moveable's handles/hit-area
  // still cover — i.e. a bounding box bigger than the actual art, which is
  // exactly the "false print area" feel this fixes.
  async function placeAsset(asset: ArtAsset) {
    const z = zCounter + 1;
    setZCounter(z);
    const pa = getPrintArea(product.name, activeView);
    // Fallback (and the max footprint art is fit inside): used outright
    // whenever the real natural size can't be read (no src — e.g. .ai/.pdf
    // — or the image fails to decode).
    let w = pa.widthPct * 0.6;
    let h = pa.heightPct * 0.6;

    if (asset.src) {
      const natural = await loadImageNaturalSizePx(asset.src);
      const containerRect = canvasRef.current?.getBoundingClientRect();
      if (natural && containerRect && containerRect.width > 0 && containerRect.height > 0) {
        const maxWidthPx = (w / 100) * containerRect.width;
        const maxHeightPx = (h / 100) * containerRect.height;
        const scale = Math.min(maxWidthPx / natural.width, maxHeightPx / natural.height);
        w = ((natural.width * scale) / containerRect.width) * 100;
        h = ((natural.height * scale) / containerRect.height) * 100;
      }
    }

    addElement({
      id: uid(),
      type: "logo",
      view: activeView,
      assetId: asset.id,
      fileName: asset.fileName,
      fileType: asset.fileType,
      src: asset.src,
      xPct: pa.xPct + (pa.widthPct - w) / 2,
      yPct: pa.yPct + (pa.heightPct - h) / 2,
      widthPct: w,
      heightPct: h,
      rotation: 0,
      zIndex: z,
    });
  }

  // Shared by every way a file can reach the canvas — the hidden file
  // input's own onChange, dropping a file onto the canvas, and pasting an
  // image from the clipboard (Ctrl/Cmd+V). addAsset uploads to the user's
  // permanent library (Supabase) before it can be placed — null if that
  // failed (no session, network error, etc.), in which case nothing is
  // placed, without breaking anything else.
  async function placeUploadedFile(file: File) {
    const asset = await addAsset(file);
    if (asset) placeAsset(asset);
  }

  async function handleLogoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    await placeUploadedFile(file);
  }

  function handleAddText() {
    const z = zCounter + 1;
    setZCounter(z);
    const pa = getPrintArea(product.name, activeView);
    // This starting box is only a placeholder to seed a reasonable center
    // point — DesignElementView's auto-fit effect immediately (before
    // paint) re-measures the real text content and snaps width/height to
    // it, recentered on this same center. widthPct/heightPct/fontSizePx
    // here never stay as authored below.
    const w = pa.widthPct * 0.4;
    const h = pa.heightPct * 0.15;
    addElement({
      id: uid(),
      type: "text",
      view: activeView,
      text: "Tu texto aquí",
      fontFamily: "DM Sans",
      fontSizePx: DEFAULT_FONT_SIZE_PX,
      color: "#1a1a1a",
      bold: false,
      italic: false,
      align: "center",
      letterSpacing: 0,
      xPct: pa.xPct + (pa.widthPct - w) / 2,
      yPct: pa.yPct + (pa.heightPct - h) / 2,
      widthPct: w,
      heightPct: h,
      rotation: 0,
      zIndex: z,
    });
  }

  function selectTechnique(id: string) {
    // Elegir una técnica nueva: con la regla de una sola técnica (default
    // hoy) reemplaza cualquier selección previa en vez de sumarse a ella
    // -- clic en Serigrafía con DTF UV ya elegido acaba en [Serigrafía].
    setSelectedTechniqueIds((prev) =>
      prev.includes(id) ? prev : ALLOW_MULTIPLE_TECHNIQUES ? [...prev, id] : [id]
    );
  }

  function toggleTechnique(id: string) {
    // Quitar la técnica ya elegida (su bote, o volver a hacer clic en su
    // card) deja la selección vacía, nunca "la anterior a esta".
    if (selectedTechniqueIds.includes(id)) {
      setSelectedTechniqueIds((prev) => prev.filter((x) => x !== id));
      return;
    }
    // by_tintas (Serigrafía / Tampografía): NO se selecciona directo --
    // abre el pop-up, y "Confirmar técnica" es lo único que la agrega
    // (ver charla 2026-09-10). Las demás técnicas se eligen igual que
    // siempre y muestran su tarjeta de detalle inline.
    const technique = techniques.find((t) => t.id === id);
    if (technique?.pricing_type === "by_tintas") {
      setModalTechniqueId(id);
      return;
    }
    selectTechnique(id);
  }

  // Único punto que cambia la cantidad real -- lo usan tanto los botones
  // -/+ como el cuadro de texto, así los dos siempre quedan sincronizados
  // sin necesidad de un efecto aparte tratando de adivinar cuál "manda".
  function setQty(next: number) {
    const clamped = Math.max(1, Math.floor(next));
    setQuantity(clamped);
    setQtyDraft(String(clamped));
  }

  function handleQtyDraftChange(raw: string) {
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    setQtyDraft(digitsOnly);
    const parsed = parseInt(digitsOnly, 10);
    if (Number.isFinite(parsed) && parsed > 0) setQuantity(parsed);
  }

  function handleQtyDraftBlur() {
    // Cuadro vacío o en 0 al salir -- vuelve a mostrar la cantidad real
    // (mínimo 1) en vez de quedarse vacío.
    if (!qtyDraft || parseInt(qtyDraft, 10) <= 0) setQtyDraft(String(quantity));
  }

  // Tamaño (ej. "10x10") a usar para calcular el precio "by_size" de UN
  // logo en particular (ya no una sola medida compartida por técnica --
  // cada logo tiene la suya). Se redondea siempre hacia el tamaño
  // configurado inmediato superior de esa técnica, nunca hacia abajo --
  // nunca se inventa un tamaño que no exista en la tabla de precios (si
  // el logo excede el tamaño configurado más grande, o el campo sigue
  // vacío, regresa null y el llamador lo trata como "requiere cotización"
  // para ese logo).
  function resolveLogoSize(technique: PrintTechnique, elementId: string): string | null {
    const dims = techniqueLogoSizeCm[technique.id]?.[elementId];
    const largo = parseFloat(dims?.largo ?? "");
    const alto = parseFloat(dims?.alto ?? "");
    if (!Number.isFinite(largo) || !Number.isFinite(alto) || largo <= 0 || alto <= 0) return null;
    const sizeOptions = Array.from(new Set(technique.price_table.map((t) => t.size).filter((s): s is string => !!s)));
    return roundUpToConfiguredSize(largo, alto, sizeOptions);
  }

  interface TechniqueResult {
    technique: PrintTechnique;
    // unitPrice YA incluye IVA (la tabla de técnicas viene sin IVA -> ver
    // techniquePriceWithIva). Se suma directo al precio del producto, que
    // también viene con IVA.
    unitPrice: number | null;
    needsQuote: boolean;
    // Texto corto para el desglose / la tarjeta confirmada, p.ej.
    // "2 posiciones · 1 tinta" o "2 logos".
    resumen: string;
  }

  // Calcula el desglose de precio de IMPRESIÓN de UN diseño (los
  // elementos de UNA clave de diseño, ver designKey) a la cantidad que le
  // corresponda -- con "Mismo diseño" se llama una sola vez, con el diseño
  // compartido y la cantidad total (idéntico al comportamiento de
  // siempre). Con "Distinto por color" se llama UNA VEZ POR COLOR (ver
  // buildCartItem), cada una con los elementos y la cantidad de ESE color
  // nada más -- el garment (tela) nunca pasa por aquí, siempre usa la
  // cantidad total combinada (ver garmentUnit arriba).
  function computeDesignPricing(elementsForDesign: ViewElements, qtyForDesign: number, dk: string) {
    const numElements = applicableViews.reduce((sum, v) => sum + elementsForDesign[v].length, 0);
    const allLogoElements = applicableViews.flatMap((v) => elementsForDesign[v].filter((e) => e.type === "logo"));
    const numLogoElements = allLogoElements.length;
    // "Posiciones" = número de logos colocados (1 logo = 1 posición,
    // criterio acordado -- charla 2026-09-10). Es el mismo para las 4
    // vistas.
    const posiciones = numLogoElements;

    // Precio de UNA técnica según su pricing_type (ver types/index.ts) --
    // nunca se inventa un precio: si falta el parámetro (tintas/tamaño) o
    // no hay un renglón que coincida exacto, unitPrice queda en null y
    // needsQuote en true.
    const priceTechnique = (technique: PrintTechnique): TechniqueResult => {
      const logosTxt = `${posiciones} ${posiciones === 1 ? "logo" : "logos"}`;
      if (technique.pricing_type === "by_qty") {
        // Nota: by_qty (DTG) y by_size (DTF) NO llevan el ×1.16 de IVA
        // todavía -- solo se aplicó a by_tintas (Serigrafía/Tampografía),
        // que es lo que se acordó. Cuando se confirme que esas tablas
        // también vienen sin IVA se envuelven igual con
        // techniquePriceWithIva.
        if (numElements === 0) return { technique, unitPrice: 0, needsQuote: false, resumen: "" };
        const price = findQtyPrice(technique, qtyForDesign);
        return price === null
          ? { technique, unitPrice: null, needsQuote: true, resumen: logosTxt }
          : { technique, unitPrice: price * numElements, needsQuote: false, resumen: logosTxt };
      }
      if (technique.pricing_type === "by_tintas") {
        if (posiciones === 0) return { technique, unitPrice: 0, needsQuote: false, resumen: "" };
        const posTxt = `${posiciones} ${posiciones === 1 ? "posición" : "posiciones"}`;
        const tintas = parseInt(techniqueTintas[tintasKeyFor(dk, technique.id)] ?? "", 10);
        if (!Number.isFinite(tintas) || tintas <= 0) return { technique, unitPrice: null, needsQuote: true, resumen: posTxt };
        const resumen = `${posTxt} · ${tintas} ${tintas === 1 ? "tinta" : "tintas"}`;
        // La fila de la tabla es posiciones × tintas y se cobra UNA vez
        // (ver findTintasPrice) -- ya NO se multiplica por el número de
        // logos como antes.
        const price = findTintasPrice(technique, tintas, posiciones, qtyForDesign);
        return price === null
          ? { technique, unitPrice: null, needsQuote: true, resumen }
          : { technique, unitPrice: techniquePriceWithIva(price), needsQuote: false, resumen };
      }
      if (technique.pricing_type === "by_size") {
        // Suma el precio de cada logo por separado -- cada uno puede
        // tener su propia medida (ver resolveLogoSize), a diferencia de
        // by_qty/by_tintas donde un solo precio se multiplica por el
        // total de elementos.
        if (allLogoElements.length === 0) return { technique, unitPrice: 0, needsQuote: false, resumen: "" };
        let sum = 0;
        let needsQuote = false;
        for (const el of allLogoElements) {
          const size = resolveLogoSize(technique, el.id);
          const price = size ? findSizePrice(technique, size, qtyForDesign) : null;
          if (price === null) needsQuote = true;
          else sum += price;
        }
        return { technique, unitPrice: needsQuote ? null : sum, needsQuote, resumen: logosTxt };
      }
      // pricing_type null -> sin datos suficientes configurados todavía.
      return { technique, unitPrice: null, needsQuote: true, resumen: "" };
    };

    const techniqueResults: TechniqueResult[] = selectedTechniqueIds
      .map((id) => techniques.find((t) => t.id === id))
      .filter((t): t is PrintTechnique => !!t)
      .map(priceTechnique);
    const anyTechniqueNeedsQuote = techniqueResults.some((r) => r.needsQuote);
    const techniqueTotal = techniqueResults.reduce((sum, r) => sum + (r.unitPrice ?? 0), 0);

    // `priceTechnique` también se expone -- lo usa el pop-up de
    // TechniqueModal para previsualizar el precio de una técnica que
    // TODAVÍA no está en selectedTechniqueIds (antes de "Confirmar
    // técnica").
    return { numElements, allLogoElements, numLogoElements, posiciones, techniqueResults, anyTechniqueNeedsQuote, techniqueTotal, priceTechnique };
  }

  // ?editar=<id> -- reabre una línea del carrito YA confirmada tal cual se
  // guardó (editor_state, ver buildCartItem), en vez del borrador normal
  // de este producto. Espera a que el carrito termine de hidratar desde
  // localStorage (si no, `cartItems` todavía está en [] y el id nunca se
  // encontraría) -- por eso depende de `cartHydrated`/`cartItems` y no
  // solo corre una vez al montar como el efecto de abajo. El ref evita
  // repetir la restauración si `cartItems` vuelve a cambiar después
  // (ej. por el autoguardado del renglón "en curso" de otro producto).
  const editarResueltoRef = useRef(false);
  useEffect(() => {
    if (!editarCartItemId || editarResueltoRef.current || !cartHydrated) return;
    editarResueltoRef.current = true;
    const item = cartItems.find((i) => i.id === editarCartItemId);
    const estado = item?.customization_snapshot?.editor_state as EditorState | undefined;
    if (item && estado) {
      const migrated = migrateElementsShape(estado.elements);
      setElements(migrated);
      setHistoryByKey(Object.fromEntries(Object.entries(migrated).map(([k, v]) => [k, [v]])));
      setHistoryIndexByKey(Object.fromEntries(Object.keys(migrated).map((k) => [k, 0])));
      setSelectedTechniqueIds(estado.selectedTechniqueIds ?? []);
      setTechniqueTintas(estado.techniqueTintas ?? {});
      setTechniqueLogoSizeCm(estado.techniqueLogoSizeCm ?? {});
      setGroupOrientation(estado.groupOrientation ?? {});
      setQuantity(item.total_quantity);
      setQtyDraft(String(item.total_quantity));
      const variantId = item.variants[0]?.variant_id;
      if (variantId) setActiveVariantId(variantId);
    }
    setDraftReady(true);
  }, [editarCartItemId, cartHydrated, cartItems]);

  // Ya NO hay borrador local por producto (ver charla 2026-09-22: el
  // carrito pasa a ser el único lugar donde vive un diseño sin terminar
  // -- "Guardar"/"Siguiente"/cerrar la página lo dejan ahí, ver
  // persistToCart más abajo). Entrar a personalizar este producto desde
  // cero (sin ?editar=) por eso siempre arranca vacío, aunque ya exista
  // un renglón guardado de este mismo producto en el carrito -- para
  // retomar ESE hay que entrar por "Editar" desde el carrito, que sí
  // trae `editarCartItemId` y cae en el efecto de arriba.
  useEffect(() => {
    if (editarCartItemId) return;
    setDraftReady(true);
  }, [editarCartItemId]);

  // El garment (tela/manufactura) SIEMPRE usa la cantidad TOTAL combinada
  // de todos los colores -- nunca cambia entre colores, ni con "Distinto
  // por color" (ver contexto del plan 2026-09-19): la tela escala igual
  // sin importar el diseño.
  const garmentUnit = getProductUnitPrice(product.costo, quantity, priceTiers);
  // Cantidad a usar para el precio de IMPRESIÓN del diseño que se está
  // viendo/editando ahora mismo: con "Distinto por color" es la de ESE
  // color nada más (colorQty); con "Mismo diseño" (o producto no
  // multicolor) sigue siendo la cantidad total, igual que siempre.
  const qtyForActiveDesign = distintoPorColor ? colorQty(activeVariantId ?? "") : quantity;
  const activeDesignPricing = computeDesignPricing(currentElements, qtyForActiveDesign, designKey);
  const { numElements, allLogoElements, numLogoElements, posiciones, techniqueResults, anyTechniqueNeedsQuote, techniqueTotal, priceTechnique } =
    activeDesignPricing;

  // Suma de elementos colocados en TODOS los diseños (todas las claves del
  // diccionario `elements`, no solo el diseño activo) -- se usa nada más
  // para decidir si hay algo que valga la pena guardar (ver
  // hasContentToSave/handleGuardar y el guardado al cerrar la página más
  // abajo). Cambiar de color sin haber puesto nada en ese color
  // específico no debe borrar lo que ya se diseñó en otro color.
  const numElementsAllDesigns = Object.values(elements).reduce(
    (sum, ve) => sum + applicableViews.reduce((s, v) => s + ve[v].length, 0),
    0
  );
  const hasContentToSave = numElementsAllDesigns > 0 || selectedTechniqueIds.length > 0;

  // "Posiciones" (tarjeta de detalle de cada técnica): los ejes reales
  // donde el cliente ya colocó algún LOGO en el canvas, agrupados con
  // cuántos logos hay en cada uno -- ya no un número que se escriba a
  // mano, ni una sola medida compartida. Mismos VIEW_LABELS que ya se
  // usan en las pestañas Frente/Reverso/Izquierda/Derecha de arriba. Con
  // "Distinto por color" es del diseño ACTIVO nada más -- cada color tiene
  // los suyos.
  const logosByView = applicableViews.map((v) => ({
    view: v,
    viewLabel: VIEW_LABELS[v],
    logos: currentElements[v].filter((e) => e.type === "logo"),
  })).filter((g) => g.logos.length > 0);
  const activePositionLabels = logosByView.map((g) => g.viewLabel);

  // Sugerencia (mejor esfuerzo) de Largo/Alto real en cm de cada logo, a
  // partir de su tamaño ya dibujado en el lienzo (widthPct/heightPct, %
  // del área de impresión) y las medidas reales de esa área (ver
  // printAreas.ts) — mismo espíritu que suggestInkCount para tintas: se
  // muestra como referencia y se auto-rellena si el campo sigue vacío,
  // pero el cliente siempre puede corregirla a mano. null cuando el
  // producto/vista todavía no tiene medidas reales configuradas (nunca se
  // inventa una).
  const suggestedSizeCmByElement: Record<string, { largo: string; alto: string } | null> = {};
  allLogoElements.forEach((el) => {
    const pa = getPrintArea(product.name, el.view);
    const real = getElementRealCm(el.widthPct, el.heightPct, pa.widthCm, pa.heightCm);
    suggestedSizeCmByElement[el.id] = real ? { largo: real.widthCm.toFixed(1), alto: real.heightCm.toFixed(1) } : null;
  });

  // Auto-rellena Largo/Alto con la sugerencia mientras el campo siga
  // vacío -- igual que tintas con onTintasChange en TechniqueModal: si el
  // cliente ya escribió algo (a mano o de una sugerencia anterior), nunca
  // se le pisa. Corre para toda técnica que use tamaño (by_size), elegida
  // o no, para que ya esté listo en cuanto se elija.
  const sizeSuggestKey = allLogoElements.map((el) => `${el.id}:${el.widthPct.toFixed(1)}:${el.heightPct.toFixed(1)}`).join("|");
  useEffect(() => {
    const sizeTechniques = techniques.filter((t) => t.pricing_type !== "by_tintas");
    if (!sizeTechniques.length || !allLogoElements.length) return;
    setTechniqueLogoSizeCm((prev) => {
      let changed = false;
      const next = { ...prev };
      sizeTechniques.forEach((t) => {
        allLogoElements.forEach((el) => {
          const suggestion = suggestedSizeCmByElement[el.id];
          if (!suggestion) return;
          const current = next[t.id]?.[el.id];
          if (current?.largo || current?.alto) return; // ya tiene algo -- nunca se pisa
          next[t.id] = { ...(next[t.id] ?? {}), [el.id]: suggestion };
          changed = true;
        });
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeSuggestKey, techniques]);

  // Pedido explícito: no se puede avanzar a "Siguiente"/checkout sin
  // elegir una técnica de impresión Y completar sus datos (tintas para
  // Serigrafía/Tampografía, tamaño en cm por logo para DTF Textil/DTF
  // UV) -- ambas condiciones ya las resuelve techniqueResults (ver
  // computeDesignPricing más abajo): sin ninguna técnica elegida no hay
  // nada en el arreglo, y needsQuote ya es true tanto para datos
  // incompletos como para pricing_type sin configurar -- en cualquiera de
  // los dos casos no hay un precio real que cobrar todavía, así que
  // tampoco debería poder pasar a checkout.
  const techniqueSelectionIncomplete = selectedTechniqueIds.length === 0 || anyTechniqueNeedsQuote;
  // Precio en vivo del diseño que se está viendo/editando ahora mismo --
  // con "Mismo diseño" es EL precio real del renglón completo (igual que
  // siempre). Con "Distinto por color" es solo una vista previa del color
  // activo (usa el tier de precio de ESE color, pero multiplicado por la
  // cantidad TOTAL para el subtotal en pantalla): el precio real y
  // definitivo del renglón completo -- sumando cada color a su propio
  // tier -- se calcula aparte en buildCartItem, ver customization_snapshot
  // .per_color.
  const unitPrice = garmentUnit + techniqueTotal;
  const subtotal = unitPrice * quantity;
  const total = subtotal;

  // El carrito/checkout/PreviewModal todavía muestran UNA sola técnica
  // (no se rediseñaron en este cambio) -- se usa la primera seleccionada
  // como referencia principal; el detalle completo de todas las técnicas
  // activas (tintas, tamaños por logo, si cada una requiere cotización)
  // se guarda de todas formas en customization_snapshot.selected_techniques,
  // así que no se pierde información aunque la UI del carrito no la
  // muestre todavía.
  const primaryTechnique = techniqueResults[0]?.technique ?? null;

  // Arma el CartItem con el estado ACTUAL del diseño -- compartido por dos
  // caminos: handleAddToCart (cuando el cliente da "Siguiente", con su
  // propio id nuevo y una captura real del canvas) y el efecto de abajo,
  // que mantiene sincronizado un renglón "en curso" en el carrito mismo
  // mientras el cliente sigue editando (mismo `id` fijo cada vez, ver
  // draftCartItemId) -- pedido explícito: "también se debe de agregar al
  // carrito de compras", para que si el cliente sale sin terminar el
  // producto YA esté ahí, no solo recuperable al volver a entrar al
  // Personalizador (ver el autoguardado local, arriba).
  // sourceVariantsItem (colores/tallas reales del renglón) se declaró
  // arriba, junto a draftCartItemId -- lo sigue usando igual aquí abajo.

  // Convierte los elementos de UN diseño (una clave del diccionario
  // `elements`) al formato de producción logos/texts -- usado tanto para
  // el modo "Mismo diseño" (una sola vez, sobre currentElements) como
  // para "Distinto por color" (una vez por color, sobre elements[variantId]).
  function buildElementsPayload(elementsForDesign: ViewElements) {
    const logos: CustomizationElement[] = [];
    const texts: CustomizationElement[] = [];
    VIEW_ORDER.forEach((v) => {
      elementsForDesign[v].forEach((el) => {
        const shared = { x: el.xPct, y: el.yPct, width: el.widthPct, height: el.heightPct, rotation: el.rotation };
        if (el.type === "logo")
          logos.push({
            type: "logo",
            url: el.src,
            ...shared,
            flip_h: el.flipH || undefined,
            flip_v: el.flipV || undefined,
            opacity: el.opacity !== undefined && el.opacity !== 100 ? el.opacity : undefined,
            brightness: el.brightness || undefined,
            contrast: el.contrast || undefined,
            recolor: el.recolor || undefined,
            bg_removed: el.bgRemoved || undefined,
          });
        else texts.push({ type: "text", text: el.text, ...shared });
      });
    });
    return { logos, texts };
  }

  // Arma el detalle de técnicas seleccionadas (tintas/tamaños/precio) para
  // UN diseño -- `dk` es la clave de diseño de ESE diseño (para resolver
  // tintas con la llave compuesta correcta, ver tintasKeyFor).
  function buildSelectedTechniques(pricing: ReturnType<typeof computeDesignPricing>, dk: string): SelectedTechniqueDetail[] {
    const positionLabels = applicableViews
      .filter((v) => pricing.allLogoElements.some((el) => el.view === v))
      .map((v) => VIEW_LABELS[v]);
    return pricing.techniqueResults.map((r) => {
      const tintasRaw = parseInt(techniqueTintas[tintasKeyFor(dk, r.technique.id)] ?? "", 10);
      const logoSizes: Record<string, string> = {};
      const sizeCmByElement: Record<string, { largo: number; alto: number }> = {};
      for (const el of pricing.allLogoElements) {
        const dims = techniqueLogoSizeCm[r.technique.id]?.[el.id];
        const largo = parseFloat(dims?.largo ?? "");
        const alto = parseFloat(dims?.alto ?? "");
        if (largo > 0 && alto > 0) sizeCmByElement[el.id] = { largo, alto };
        const resolved = resolveLogoSize(r.technique, el.id);
        if (resolved) logoSizes[el.id] = resolved;
      }
      return {
        technique_id: r.technique.id,
        technique_name: r.technique.name,
        tintas: Number.isFinite(tintasRaw) && tintasRaw > 0 ? tintasRaw : undefined,
        positions: positionLabels.length > 0 ? positionLabels : undefined,
        logo_sizes: Object.keys(logoSizes).length > 0 ? logoSizes : undefined,
        size_cm: Object.keys(sizeCmByElement).length > 0 ? sizeCmByElement : undefined,
        unit_price: r.unitPrice,
        needs_quote: r.needsQuote,
      };
    });
  }

  function buildCartItem(id: string, canvasDataUrl: string): CartItem {
    const variant = activeVariant ?? product.variants.find((v) => v.active) ?? product.variants[0];
    const variantsForItem = sourceVariantsItem?.variants.length
      ? sourceVariantsItem.variants
      : variant
      ? [{ variant_id: variant.id, color_name: variant.color_name, color_hex: variant.color_hex, qty: quantity, sizes_breakdown: {} }]
      : [];
    const totalQty = sourceVariantsItem?.total_quantity ?? quantity;

    // "Mismo diseño" -- comportamiento de siempre, sin cambio: un solo
    // diseño compartido (currentElements === elements[SHARED_KEY], porque
    // designKey es SHARED_KEY cuando !distintoPorColor).
    if (!distintoPorColor) {
      const { logos, texts } = buildElementsPayload(currentElements);
      return {
        id,
        product,
        variants: variantsForItem,
        total_quantity: totalQty,
        technique_id: primaryTechnique?.id ?? null,
        technique: primaryTechnique ?? undefined,
        num_elements: numElements,
        num_logo_elements: allLogoElements.length,
        customization_snapshot:
          numElements > 0
            ? {
                canvas_data_url: canvasDataUrl,
                logos,
                texts,
                applied_to: "all",
                // Estado completo del editor -- para que "Editar" desde el
                // carrito reabra el lienzo EXACTO (ver el efecto de
                // ?editar= arriba). logos/texts arriba son informativos
                // (producción) y no alcanzan para reconstruir el lienzo:
                // no llevan a qué vista pertenecen ni el estilo del texto.
                editor_state: { elements, selectedTechniqueIds, techniqueTintas, techniqueLogoSizeCm, groupOrientation } satisfies EditorState,
                selected_techniques: buildSelectedTechniques(activeDesignPricing, designKey),
              }
            : null,
        unit_price: unitPrice,
        total_price: total,
      };
    }

    // "Distinto por color" -- un sub-objeto por color, cada uno calculado
    // con SU PROPIA cantidad (colorQty) y SUS PROPIOS elementos
    // (elements[variantId]). El garment sigue siempre al tier de la
    // cantidad TOTAL combinada (garmentUnit, calculado arriba, igual para
    // todos los colores) -- solo la parte de impresión cambia por color.
    const perColor: Record<string, PerColorCustomization> = {};
    let totalPrice = 0;
    let anyElements = false;
    variantsForItem.forEach((v) => {
      const elementsForColor = elements[v.variant_id] ?? emptyViewElements();
      const qty = v.qty;
      const pricing = computeDesignPricing(elementsForColor, qty, v.variant_id);
      const { logos, texts } = buildElementsPayload(elementsForColor);
      if (pricing.numElements > 0) anyElements = true;
      const colorUnitPrice = garmentUnit + pricing.techniqueTotal;
      totalPrice += colorUnitPrice * qty;
      perColor[v.variant_id] = {
        logos,
        texts,
        selected_techniques: buildSelectedTechniques(pricing, v.variant_id),
        num_elements: pricing.numElements,
        num_logo_elements: pricing.allLogoElements.length,
        unit_price: colorUnitPrice,
      };
    });

    return {
      id,
      product,
      variants: variantsForItem,
      total_quantity: totalQty,
      technique_id: primaryTechnique?.id ?? null,
      technique: primaryTechnique ?? undefined,
      num_elements: numElements,
      num_logo_elements: allLogoElements.length,
      customization_snapshot: anyElements
        ? {
            canvas_data_url: canvasDataUrl,
            logos: [],
            texts: [],
            applied_to: "per_color",
            per_color: perColor,
            editor_state: { elements, selectedTechniqueIds, techniqueTintas, techniqueLogoSizeCm, groupOrientation } satisfies EditorState,
          }
        : null,
      // Promedio nada más (ver comentario en CartItem.unit_price) -- el
      // total real a cobrar es total_price, siempre.
      unit_price: totalQty > 0 ? totalPrice / totalQty : 0,
      total_price: totalPrice,
    };
  }

  // Id REAL y permanente de este renglón en el carrito, una vez que ya se
  // guardó una vez en esta sesión (por "Guardar" o por "Siguiente") -- ver
  // charla 2026-09-22: el carrito pasa a ser el único lugar donde vive
  // cualquier borrador, así que el PRIMER guardado de una sesión nueva
  // mintea un id real (igual que "Siguiente" ya hacía) y todo guardado
  // posterior en la MISMA sesión actualiza ese mismo id, nunca uno nuevo.
  // Nunca es igual a draftCartItemId (el placeholder de qty/color que ya
  // viene de la ficha, ver productDraftCartItemId) ni aplica cuando se
  // está editando un renglón ya existente (?editar=, que siempre usa
  // editarCartItemId directo).
  const savedItemIdRef = useRef<string | null>(null);

  // "Guardado en carrito como borrador" / "Actualizado en carrito" (ver
  // charla 2026-09-22) -- un pill flotante simple, se auto-oculta solo.
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2500);
  }
  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  // Único punto que decide A CUÁL renglón del carrito se escribe --
  // usado por "Guardar" (cualquier vista), "Siguiente", y el guardado
  // automático al cerrar la página (ver el efecto de abajo). `isNew` es
  // lo que decide el texto de la notificación.
  function persistToCart(canvasDataUrl: string): { id: string; isNew: boolean } {
    if (editarCartItemId) {
      upsertItem(buildCartItem(editarCartItemId, canvasDataUrl));
      return { id: editarCartItemId, isNew: false };
    }
    if (savedItemIdRef.current) {
      upsertItem(buildCartItem(savedItemIdRef.current, canvasDataUrl));
      return { id: savedItemIdRef.current, isNew: false };
    }
    const newId = uid();
    addItem(buildCartItem(newId, canvasDataUrl));
    // Reemplaza el placeholder de qty/color de la ficha (ver
    // productDraftCartItemId) -- ya quedó su propio renglón real, dos a
    // la vez se verían como el mismo producto duplicado en el carrito.
    removeItem(draftCartItemId);
    savedItemIdRef.current = newId;
    return { id: newId, isNew: true };
  }

  // Red de seguridad si se cierra la pestaña/página sin darle a "Guardar"
  // ni a "Siguiente" -- mismo `persistToCart` de arriba, pero escribiendo
  // de forma SINCRÓNICA (ver upsertItemSync en CartContext) porque un
  // "pagehide" no da garantía de que React llegue a aplicar un setState
  // normal antes de que la página ya se haya ido. Nunca mientras se está
  // restaurando (`draftReady`) ni si no hay nada que valga la pena
  // guardar todavía.
  useEffect(() => {
    function handlePageHide() {
      if (!draftReady) return;
      const hasContent = numElementsAllDesigns > 0 || selectedTechniqueIds.length > 0;
      if (!hasContent) return;
      const targetId = editarCartItemId ?? savedItemIdRef.current;
      if (targetId) {
        upsertItemSync(buildCartItem(targetId, ""));
      } else {
        const newId = uid();
        upsertItemSync(buildCartItem(newId, ""), draftCartItemId);
        savedItemIdRef.current = newId;
      }
    }
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draftReady,
    editarCartItemId,
    draftCartItemId,
    numElementsAllDesigns,
    selectedTechniqueIds,
    elements,
    techniqueTintas,
    techniqueLogoSizeCm,
    quantity,
    activeVariantId,
    unitPrice,
    total,
  ]);

  const [guardando, setGuardando] = useState(false);
  // "Guardar" -- visible sin importar la vista activa (Frente/Reverso/
  // Izquierda/Derecha, ver charla 2026-09-22), siempre guarda el producto
  // COMPLETO (las 4 vistas), no solo la vista donde se dio clic. A
  // diferencia de "Siguiente", nunca exige que la técnica esté completa
  // (es justo para no perder trabajo a medias) y no captura una foto real
  // del lienzo -- esa solo hace falta al confirmar de verdad.
  function handleGuardar() {
    if (guardando || !hasContentToSave) return;
    setGuardando(true);
    try {
      const { isNew } = persistToCart("");
      showNotice(isNew ? "Guardado en carrito como borrador" : "Actualizado en carrito");
    } finally {
      setGuardando(false);
    }
  }

  async function handleAddToCart() {
    // Segunda barrera además del disabled del botón (ver
    // techniqueSelectionIncomplete) -- este es el único punto real por el
    // que se agrega al carrito/checkout, tanto desde "Siguiente" como
    // desde "Confirmar diseño" del PreviewModal, así que basta con
    // proteger aquí para cubrir los dos caminos a la vez.
    if (addingToCart || techniqueSelectionIncomplete) return;
    setAddingToCart(true);
    try {
      let canvasDataUrl = "";
      if (canvasRef.current && numElements > 0) {
        try {
          canvasDataUrl = await toPng(canvasRef.current, { pixelRatio: 2 });
        } catch {
          canvasDataUrl = "";
        }
      }

      const { isNew } = persistToCart(canvasDataUrl);
      selectOnly(null);
      // Ya no se abre ningún popover local -- el badge/pulso del carrito en
      // PublicHeader (barra superior) ya reacciona solo porque comparte el
      // mismo CartContext. La leyenda de abajo sí se deja ver un momento
      // antes de navegar (ver charla 2026-09-22: "Siguiente" también debe
      // mostrarla).
      showNotice(isNew ? "Guardado en carrito como borrador" : "Actualizado en carrito");
      await new Promise((resolve) => setTimeout(resolve, 700));
      // Revertido -- pedido explícito (ver charla 2026-09-16): "Siguiente"
      // vuelve a mandar al carrito, no directo a checkout. El carrito es
      // justo la pantalla donde el cliente revisa/resume su compra (y
      // ahora también ve la fecha estimada de entrega) antes de pagar.
      router.push("/carrito");
    } finally {
      setAddingToCart(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-8 px-6 py-6 lg:flex-row lg:items-start lg:gap-10">
      {/* ── Canvas (izquierda, ~65%) ── */}
      <div className="w-full lg:w-[65%]">
        <div className="relative rounded-[24px] bg-white p-6 shadow-[0_2px_28px_rgba(0,0,0,0.05)]">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-8">
              {tabGroups.map((group) => {
                const active = group.views.includes(activeView);
                const TabIcon = group.icon;
                // Pestaña de un solo eje: activa ese eje directo, igual
                // que siempre. Pestaña agrupada ("Funda"/"Liga", 2 ejes):
                // activa la última elección recordada de ESE grupo -- el
                // eje real se elige con el toggle debajo del canvas, no
                // aquí arriba.
                const target = group.views.length > 1 ? groupOrientation[group.key] ?? group.views[0] : group.views[0];
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => {
                      setActiveView(target);
                      setFilesTabView(target);
                      selectOnly(null);
                    }}
                    className={`flex items-center gap-2 border-b-[3px] pb-3 transition-all duration-200 ease-out ${
                      active ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <TabIcon className={`h-4 w-4 transition-colors duration-200 ${active ? "text-primary" : "text-ui-gray"}`} />
                    <span className={`text-sm font-semibold transition-colors duration-200 ${active ? "text-foreground" : "text-ui-gray"}`}>
                      {group.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* El botón de carrito interno se eliminó -- el único carrito
                de esta pantalla ahora es el de PublicHeader (barra
                superior). El ojo conserva su función real (abre
                PreviewModal), así que se queda igual. */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  selectOnly(null);
                  setPreviewOpen(true);
                }}
                aria-label="Vista previa del producto personalizado"
                className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,0,0,0.14)]"
              >
                <EyeIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Toggle del grupo activo (Horizontal/Vertical para Funda,
              Frente/Reverso para Liga...) -- SOLO aparece con una pestaña
              agrupada activa que de verdad ofrezca 2+ ejes (ver
              showGroupToggle arriba). Sutil (texto pequeño, fondo gris
              claro) pero entendible (etiquetas explícitas, no solo
              íconos) -- pedido explícito: la elección real ya no vive
              arriba como una pestaña más, vive aquí debajo. Cambiar de
              eje dentro del grupo NUNCA toca `elements` de los demás --
              cada uno es su propio eje con su propio diseño, exactamente
              como cambiar de Frente a Reverso. */}
          {showGroupToggle && activeGroupDef && (
            <div className="mb-5 inline-flex items-center gap-1 rounded-full bg-gray-50 p-1">
              {activeGroupViews.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setGroupOrientation((prev) => ({ ...prev, [activeGroupDef.key]: v }));
                    setActiveView(v);
                    setFilesTabView(v);
                    selectOnly(null);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ease-out ${
                    activeView === v ? "bg-white text-foreground shadow-sm" : "text-ui-gray hover:text-foreground"
                  }`}
                >
                  {activeGroupDef.subLabel(v)}
                </button>
              ))}
            </div>
          )}

          {/* Barra de colores — SOLO aparece cuando el usuario activó
              "Multicolor" en la página del producto Y eligió más de un
              color (`showColorBar`, ver arriba). NO es un selector de
              colores de la prenda en general -- únicamente permite
              alternar entre los colores que ya se eligieron antes de
              entrar aquí; nunca muestra los 6 colores completos. Con
              "Mismo diseño" (default), cambiar de color en esta barra SOLO
              cambia `activeVariantId` (y por lo tanto `garmentColor`):
              nunca toca `elements`, así que el diseño colocado por el
              usuario se mantiene intacto (misma posición/escala/rotación
              %) al alternar de prenda. Con "Distinto por color" (ver
              designKey más arriba) SÍ importa: cambiar de color aquí
              también cambia QUÉ diseño se está editando -- por eso el
              label "Editando: {color}" debajo, para que quede claro. */}
          {showColorBar && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold text-ui-gray">Color de la prenda:</span>
              {barVariants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveVariantId(v.id)}
                  title={v.color_name}
                  aria-label={`Color ${v.color_name}`}
                  aria-pressed={activeVariant?.id === v.id}
                  style={{ backgroundColor: v.color_hex }}
                  className={`h-8 w-8 rounded-full border-2 transition-all duration-150 ease-out ${
                    activeVariant?.id === v.id
                      ? "border-primary scale-110 ring-2 ring-primary/30 shadow-[0_0_0_4px_rgba(87,224,217,0.12)]"
                      : "border-white ring-1 ring-ui-border hover:scale-105"
                  }`}
                />
              ))}
              {distintoPorColor && activeVariant && (
                <span className="ml-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-dark">
                  Editando: {activeVariant.color_name}
                </span>
              )}
            </div>
          )}

          <div className="relative flex justify-center">
            {/* Barra de herramientas flotante */}
            <div className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3">
              <ToolDockButton label="Texto" onClick={handleAddText}>
                <TextToolIcon className="h-5 w-5" />
              </ToolDockButton>
              <ToolDockButton label="Imagen" onClick={() => fileInputRef.current?.click()}>
                <ImageToolIcon className="h-5 w-5" />
              </ToolDockButton>
              <ToolDockButton label="Capas" active={layersOpen} onClick={() => setLayersOpen((v) => !v)}>
                <LayersIcon className="h-5 w-5" />
              </ToolDockButton>
            </div>

            <div
              ref={canvasRef}
              className="relative"
              // maxWidth acota el lienzo dentro de la tarjeta -- sin esto, un
              // aspect ratio ancho (ej. fundaHorizontal, 848/335 ≈ 2.5, la
              // funda real fotografiada tendida) calcula su ancho como
              // altura×aspect SIN tope, desbordándose de la tarjeta entera
              // (bug real, confirmado al agregar este eje: el lienzo se veía
              // cortado por los bordes del navegador). El navegador reduce
              // altura y ancho juntos manteniendo el aspect ratio al toparse
              // con maxWidth, igual que un <img> con solo un lado fijado.
              //
              // Un aspect ratio ancho (> 1, hoy solo fundaHorizontal) además
              // se topa con un segundo tope, más chico (600px en vez de
              // 100%): con el de arriba solo, el lienzo seguía casi tan
              // ancho como la tarjeta completa, y como sigue centrado con
              // flex justify-center, dejaba casi sin margen izquierdo -- ahí
              // es exactamente donde flota la barra de herramientas
              // (Texto/Imagen/Capas, ver ToolDockButton arriba), que
              // terminaba encima de la propia foto en vez de a un lado
              // (reportado explícitamente: "sin que tenga iconos que
              // bloqueen"). Con el lienzo más angosto y centrado, le queda
              // margen real de sobra en ambos lados. Nunca afecta a un eje
              // con aspect <= 1 (todos los demás, incluida fundaVertical):
              // esos ya son más angostos que 600px por sí solos, así que
              // este tope extra nunca llega a aplicar.
              style={{
                // Bajado de min(75vh,720px) -- pedido explícito (ver charla
                // 2026-09-16): esa altura fija empujaba el hem de la prenda
                // fuera del viewport en laptops típicas, obligando a hacer
                // scroll para ver la imagen completa dentro del propio
                // recuadro. Con esto cabe completa sin scroll junto con el
                // resto del chrome (header + tabs + padding) en pantallas
                // normales.
                height: "min(58vh, 560px)",
                aspectRatio: asset.aspect,
                maxWidth: asset.aspect > 1 ? "min(100%, 600px)" : "100%",
              }}
              onMouseDown={(e) => {
                // react-moveable's own resize/rotate handles live inside this
                // same canvas div (DesignElementView renders <Moveable> as a
                // sibling of the target, not portaled elsewhere) — their DOM
                // node is `.moveable-control-box`. Without this guard, EVERY
                // mousedown on a handle also bubbles up here and deselects,
                // unmounting <Moveable> mid-gesture before a single onResize/
                // onRotate frame can fire — this is why dragging a corner
                // handle looked like it "didn't respond" at all: the drag
                // never actually started, the element was just deselected
                // instantly. Same root-cause family as the eye-button
                // click-suppression bug documented for this file — any
                // click that starts on Moveable's own UI must never reach
                // this deselect-on-elsewhere handler.
                if ((e.target as HTMLElement).closest(".moveable-control-box")) return;
                selectOnly(null);
              }}
              onDragEnter={(e) => {
                if (!e.dataTransfer.types.includes("Files")) return;
                e.preventDefault();
                dragCounterRef.current += 1;
                setIsDragOverCanvas(true);
              }}
              onDragOver={(e) => {
                // Required for onDrop to ever fire at all — a bare <div>
                // rejects drops by default unless dragover is prevented.
                if (!e.dataTransfer.types.includes("Files")) return;
                e.preventDefault();
              }}
              onDragLeave={() => {
                dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
                if (dragCounterRef.current === 0) setIsDragOverCanvas(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                dragCounterRef.current = 0;
                setIsDragOverCanvas(false);
                handleLogoFiles(e.dataTransfer.files);
              }}
            >
              {activeViewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeViewSrc}
                  alt={`${product.name} — ${VIEW_LABELS[activeView]} — ${activeVariant?.color_name ?? ""}`}
                  className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gray-50">
                  <p className="text-sm text-ui-gray">Fotografías no disponibles aún</p>
                </div>
              )}

              {isDragOverCanvas && (
                <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10">
                  <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-md">
                    Suelta la imagen para agregarla
                  </span>
                </div>
              )}

              {currentElements[activeView].map((el) => (
                <DesignElementView
                  key={el.id}
                  element={el}
                  containerRef={canvasRef}
                  selected={selectedIds.has(el.id)}
                  // Las manijas de mouse (arrastrar/redimensionar/rotar) solo
                  // se muestran con exactamente 1 seleccionado -- nunca se
                  // construyó arrastre de grupo, así que con 2+
                  // seleccionados cada elemento se queda con el aro de
                  // "seleccionado" nada más (el Shift+flecha de abajo sigue
                  // funcionando sobre todos igual).
                  interactive={selectedIds.size === 1}
                  onSelect={(id, shift) => (shift ? toggleSelect(id) : selectOnly(id))}
                  onChange={updateElement}
                  onInteraction={handleElementInteraction}
                />
              ))}

              <PrintAreaGuide visible={Boolean(selectedElement) && !interactionInBounds} />
            </div>

            {layersOpen && (
              <div className="absolute right-6 top-0 z-20 w-60 rounded-2xl border border-ui-border bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ui-gray">Capas — {VIEW_LABELS[activeView]}</p>
                {currentElements[activeView].length === 0 ? (
                  <p className="text-xs text-ui-gray">Sin elementos.</p>
                ) : (
                  <div className="space-y-1">
                    {[...currentElements[activeView]]
                      .sort((a, b) => b.zIndex - a.zIndex)
                      .map((el) => (
                        <button
                          key={el.id}
                          type="button"
                          onClick={() => selectOnly(el.id)}
                          className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-xs transition-colors duration-150 ease-out ${
                            selectedIds.has(el.id) ? "bg-primary/15 font-semibold text-foreground" : "text-ui-gray hover:bg-gray-50"
                          }`}
                        >
                          {el.type === "logo" ? el.fileName : `“${el.text}”`}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Deshacer"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-200 ease-out hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-foreground"
            >
              <UndoIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Rehacer"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-200 ease-out hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-foreground"
            >
              <RedoIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Panel (derecha, ~35%) ── */}
      <aside className="w-full lg:sticky lg:top-8 lg:w-[35%]">
        {/* Vive en el sidebar (nunca en el lienzo) a propósito: pedido
            explícito -- el usuario debe ver la prenda completa junto con
            el logo MIENTRAS edita. Ni un overlay flotando encima del
            lienzo ni empujarlo hacia abajo lo permiten (ambos ya probados
            y descartados) -- aquí, en la columna de al lado, el lienzo
            completo queda siempre visible sin importar si este panel está
            abierto. */}
        {/* Barra de herramientas del elemento seleccionado — vive aquí en
            el sidebar, NUNCA sobre/encima del lienzo: ponerla en el
            lienzo (flotando o empujándolo) ya se probó y se descartó
            porque tapa o mueve la prenda mientras se edita (ver charla
            2026-09-10 y los comentarios de "Opciones de diseño"). Aquí la
            columna izquierda con la prenda completa nunca se mueve. */}
        {selectedElement && (
          <div ref={designOptionsButtonRef} className="mb-6">
            <SelectionToolbar
              element={selectedElement}
              onChange={updateElement}
              onDuplicate={() => duplicateElement(selectedElement.id)}
              onDelete={() => deleteElement(selectedElement.id)}
              onBringFront={() => bringToFront(selectedElement.id)}
              onSendBack={() => sendToBack(selectedElement.id)}
              designOptionsOpen={designOptionsOpen}
              onToggleDesignOptions={() => setDesignOptionsOpen((v) => !v)}
            />
          </div>
        )}
        {selectedElement?.type === "logo" && designOptionsOpen && (
          <div ref={designOptionsPanelRef} className="mb-6">
            <DesignOptionsPanel element={selectedElement} onChange={updateElement} />
          </div>
        )}
        <div className="space-y-6 rounded-[24px] bg-white p-6 shadow-[0_2px_28px_rgba(0,0,0,0.05)]">
          <div>
            <h1 className="font-display text-xl font-bold uppercase leading-[1.15] text-foreground">{product.name}</h1>
            <p className="mt-1 text-xs text-ui-gray">{product.sku}</p>
          </div>

          <div>
            <span className="mb-3 block text-base font-bold text-foreground">3. Personaliza tu producto</span>

            {/* Grid de lo ya agregado en ESTA vista (logos/textos), igual
                de tiles que "Mis artes" (ver ArtLibraryPanel) -- pedido
                explícito (ver charla 2026-09-16): antes solo se veían
                abriendo el panel de Capas; ahora se ven de un vistazo sin
                ningún pop-up. Clic en un tile selecciona ese elemento
                (mismo criterio que Capas); la "×" lo borra directo. */}
            <div className="grid grid-cols-3 gap-3">
              {[...currentElements[activeView]]
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((el) => (
                  <div
                    key={el.id}
                    className={`group relative aspect-square overflow-hidden rounded-2xl border bg-white transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] ${
                      selectedIds.has(el.id) ? "border-primary ring-2 ring-primary/25" : "border-ui-border hover:border-primary/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectOnly(el.id)}
                      aria-label={el.type === "logo" ? el.fileName : `Texto “${el.text}”`}
                      className="flex h-full w-full items-center justify-center p-2.5"
                    >
                      {el.type === "logo" ? (
                        el.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={el.src} alt={el.fileName} className="h-full w-full object-contain" draggable={false} />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gray-400 bg-white/85 p-1 text-center">
                            <span className="text-[9px] font-semibold uppercase text-ui-gray">{el.fileType}</span>
                            <span className="truncate px-1 text-[8px] leading-tight text-ui-gray">{el.fileName}</span>
                          </div>
                        )
                      ) : (
                        <span
                          className="line-clamp-3 break-words text-center text-xs leading-tight"
                          style={{ color: el.color, fontFamily: el.fontFamily, fontWeight: el.bold ? 700 : 500, fontStyle: el.italic ? "italic" : "normal" }}
                        >
                          "{el.text}"
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteElement(el.id)}
                      aria-label={el.type === "logo" ? `Eliminar ${el.fileName}` : "Eliminar texto"}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ui-gray opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-opacity duration-150 ease-out hover:text-accent-coral group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ui-border px-2 text-center text-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5"
              >
                <ImageToolIcon className="h-5 w-5 shrink-0 text-ui-gray transition-colors duration-200 ease-out group-hover:text-primary" />
                <span className="text-xs font-semibold leading-tight">Agregar imagen</span>
                <span className="text-[10px] leading-tight text-ui-gray">PNG, SVG, PDF, AI</span>
              </button>
              <button
                type="button"
                onClick={handleAddText}
                className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ui-border px-2 text-center text-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5"
              >
                <TextToolIcon className="h-5 w-5 shrink-0 text-ui-gray transition-colors duration-200 ease-out group-hover:text-primary" />
                <span className="text-xs font-semibold leading-tight">Agregar texto</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,.png,.pdf,.ai"
              className="hidden"
              onChange={(e) => handleLogoFiles(e.target.files)}
            />
          </div>

          <div>
            <span className="mb-3 block text-base font-bold text-foreground">4. Selecciona el Tipo de impresión</span>
            {/* Solo esta fila "sangra" fuera del padding del panel (-mx-8) para
                ganar el máximo ancho posible sin tocar el padding compartido
                por el resto de secciones — el título arriba se queda alineado
                como siempre. */}
            {techniques.length === 0 ? (
              <p className="text-sm text-ui-gray">No hay técnicas de impresión disponibles para este producto.</p>
            ) : (
              <>
                <div className="-mx-6">
                  <PrintTechniqueCards techniques={techniques} selectedIds={selectedTechniqueIds} onToggle={toggleTechnique} />
                </div>
                {/* Serigrafía/Tampografía (by_tintas): el clic en su card
                    abre el pop-up (TechniqueModal); ya confirmadas se ven
                    como una tarjeta compacta (TechniqueConfirmedRow) con
                    "✎" para reabrir el pop-up y el bote para quitarla.
                    Las demás técnicas (DTF/DTG) siguen con su tarjeta de
                    detalle inline: "Posiciones" agrupado por eje (ver
                    logosByView), cada eje con su panel de Largo/Alto (cm)
                    POR LOGO. El botón de basura quita la técnica (mismo
                    toggleTechnique que su card de arriba). */}
                {techniqueResults.length > 0 && (
                  <div className="mt-5 flex flex-col gap-3">
                    {techniqueResults.map(({ technique, unitPrice, needsQuote, resumen }) =>
                      technique.pricing_type === "by_tintas" ? (
                        // by_tintas: tarjeta compacta de "ya confirmada".
                        // Los datos (tintas) se editan en el pop-up ("✎").
                        <TechniqueConfirmedRow
                          key={technique.id}
                          technique={technique}
                          resumen={resumen}
                          unitPrice={unitPrice}
                          needsQuote={needsQuote}
                          onEdit={() => setModalTechniqueId(technique.id)}
                          onRemove={() => toggleTechnique(technique.id)}
                        />
                      ) : (
                        <TechniqueDetailCard
                          key={technique.id}
                          technique={technique}
                          unitPrice={unitPrice}
                          needsQuote={needsQuote}
                          logosByView={logosByView}
                          logoSizeCm={techniqueLogoSizeCm[technique.id] ?? {}}
                          suggestedSizeCm={suggestedSizeCmByElement}
                          onLogoSizeCmChange={(elementId, patch) =>
                            setTechniqueLogoSizeCm((prev) => ({
                              ...prev,
                              [technique.id]: {
                                ...(prev[technique.id] ?? {}),
                                [elementId]: { ...(prev[technique.id]?.[elementId] ?? { largo: "", alto: "" }), ...patch },
                              },
                            }))
                          }
                          selectedElementId={selectedId}
                          onSelectLogo={(view, elementId) => {
                            setActiveView(view);
                            selectOnly(elementId);
                          }}
                          tintas={techniqueTintas[tintasKey(technique.id)] ?? ""}
                          onTintasChange={(v) => setTechniqueTintas((prev) => ({ ...prev, [tintasKey(technique.id)]: v }))}
                          onRemove={() => toggleTechnique(technique.id)}
                        />
                      )
                    )}
                  </div>
                )}

                {/* Desglose de precio (producto + técnicas → Subtotal /
                    IVA / Total) -- estilo ONPOINT, ver charla 2026-09-10.
                    Solo aparece con al menos una técnica elegida. */}
                {techniqueResults.length > 0 && (
                  <div className="mt-4">
                    <PrecioDesglose
                      productName={product.name}
                      garmentUnit={garmentUnit}
                      techniqueResults={techniqueResults}
                      quantity={quantity}
                      total={total}
                      anyTechniqueNeedsQuote={anyTechniqueNeedsQuote}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* La píldora glass de "Resumen del pedido" (cantidad + total +
              no. de logos) se quitó: el total ya vive en el Desglose de
              arriba, y la cantidad se define en el paso 1 (ficha del
              producto) -- tenerla también aquí solo repetía el control
              (ver charla 2026-09-10). El diseño/técnica/tintas se
              autoguardan en el navegador (localStorage), así que salir y
              volver no pierde nada; la cantidad se restaura del mismo
              borrador si el link ya no trae ?qty. */}

          {/* "Guardar" -- visible sin importar la vista activa (ver charla
              2026-09-22), siempre guarda el producto completo en el
              carrito como borrador, sin exigir que la técnica esté
              completa (a diferencia de "Siguiente" de abajo). */}
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || !hasContentToSave}
            title={hasContentToSave ? undefined : "Coloca algo primero para poder guardarlo"}
            className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-ui-border bg-white text-sm font-semibold text-foreground transition-all duration-200 ease-out hover:border-primary hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SaveIcon className="h-4 w-4" />
            {guardando ? "Guardando..." : "Guardar"}
          </button>

          {/* "Minimal Sólido" (pedido explícito, reemplaza el tratamiento
              glass/glow de antes) -- colores sólidos únicamente, sin
              degradados/glass/glow. Tamaño/posición/separación/texto/
              lógica/disabled intactos: mismo Link/button, mismo href/
              onClick/disabled de siempre. */}
          <div className="flex gap-4">
            <Link
              // Con ?editar=<id> hay que devolver ese mismo parámetro --
              // pedido explícito (ver charla 2026-09-16): sin él, el paso
              // 1-2 no tenía ninguna pista de qué renglón YA CONFIRMADO
              // restaurar (solo sabía buscar el borrador "en progreso",
              // un id distinto) y arrancaba en blanco (color/cantidad en
              // cero) aunque el renglón real seguía guardado en el
              // carrito. Sin editarCartItemId (flujo normal, nunca
              // confirmado todavía) se queda igual que siempre.
              href={editarCartItemId ? `/producto/${product.id}?editar=${editarCartItemId}` : `/producto/${product.id}`}
              className="flex h-14 flex-1 items-center justify-center rounded-full border border-foreground bg-white text-base font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-foreground hover:text-white active:scale-[0.98]"
            >
              Atrás
            </Link>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={addingToCart || techniqueSelectionIncomplete}
              title={techniqueSelectionIncomplete ? "Elige una técnica de impresión y completa sus datos" : undefined}
              className="group flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-white shadow-[0_4px_14px_rgba(87,224,217,0.28)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_6px_18px_rgba(87,224,217,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-primary disabled:hover:shadow-[0_4px_14px_rgba(87,224,217,0.28)]"
            >
              {addingToCart ? "Agregando..." : "Siguiente"}
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-[3px]" />
            </button>
          </div>
        </div>
      </aside>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        elements={currentElements}
        productName={product.name}
        technique={primaryTechnique}
        resolvedAssets={resolvedAssets}
        garmentColor={garmentColor}
        onConfirm={() => {
          setPreviewOpen(false);
          handleAddToCart();
        }}
        confirmDisabled={techniqueSelectionIncomplete}
        confirmDisabledReason={
          selectedTechniqueIds.length === 0
            ? "Selecciona una técnica de impresión para continuar."
            : "Completa los datos de la técnica elegida (tintas/tamaño) para continuar."
        }
      />

      {(() => {
        const modalTechnique = modalTechniqueId ? techniques.find((t) => t.id === modalTechniqueId) ?? null : null;
        if (!modalTechnique) return null;
        const preview = priceTechnique(modalTechnique);
        return (
          <TechniqueModal
            technique={modalTechnique}
            logosByView={logosByView}
            posiciones={posiciones}
            quantity={quantity}
            tintas={techniqueTintas[tintasKey(modalTechnique.id)] ?? ""}
            onTintasChange={(v) => setTechniqueTintas((prev) => ({ ...prev, [tintasKey(modalTechnique.id)]: v }))}
            unitPrice={preview.unitPrice}
            needsQuote={preview.needsQuote}
            resumen={preview.resumen}
            onConfirm={() => {
              selectTechnique(modalTechnique.id);
              setModalTechniqueId(null);
            }}
            onClose={() => setModalTechniqueId(null)}
          />
        );
      })()}

      {/* "Guardado en carrito como borrador" / "Actualizado en carrito"
          (ver charla 2026-09-22) -- pill flotante simple, se oculta solo. */}
      {notice && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center">
          <span className="pointer-events-auto rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
            {notice}
          </span>
        </div>
      )}

    </div>
  );
}