"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

function BadgeIcon() {
  return (
    <svg viewBox="48.5 16 17 19" className="h-[19px] w-[17px]" aria-hidden="true">
      <path d="M65.5002 32.3335V32.4762C65.4052 32.6239 65.2697 32.7016 65.0731 32.7113L63.2581 32.7986C62.9415 32.8139 62.5569 33.0244 62.3864 33.2798L61.3698 34.8022C61.3025 34.9033 61.1674 34.971 61.0529 34.9695C60.9384 34.968 60.8057 34.8862 60.7298 34.7613L58.057 30.3746L57.4361 30.7862C57.0066 31.071 56.3965 30.7092 55.9391 30.3731L53.227 34.8431L53.0246 34.9996H52.8377L52.6419 34.8542L51.6074 33.3099C51.4381 33.0571 51.0561 32.8433 50.7412 32.8276L48.837 32.7347C48.719 32.7291 48.5738 32.6428 48.5321 32.5592C48.4932 32.4811 48.4846 32.3238 48.5422 32.229L51.1032 28.0029C51.2325 27.7895 50.8521 27.8237 50.3596 27.5719C49.7095 27.2399 49.9676 26.5207 50.1276 25.8071C50.2062 25.4561 50.1513 25.1185 49.9131 24.8392L49.2855 24.1033C48.9226 23.6779 48.9748 23.2451 49.3252 22.8123L49.9684 22.0176C50.1591 21.7819 50.2261 21.4796 50.1665 21.1906L49.9812 20.2867C49.8741 19.7646 50.089 19.3894 50.6111 19.218L51.5665 18.9045C52.2724 18.6728 52.2868 17.9529 52.6582 17.2423C53.1589 16.2845 54.6496 17.3253 55.1515 17.0278C55.7047 16.6998 56.2587 16.1086 56.9206 16.0067C57.1686 15.9684 57.4396 16.0993 57.6288 16.2417L58.4355 16.8478C58.6675 17.0222 58.991 17.0966 59.2838 17.0356L60.3007 16.8236C60.8158 16.7162 61.1931 16.908 61.3799 17.3721L61.7471 18.285C62.0087 18.935 62.7375 18.9365 63.4913 19.2481C64.245 19.5597 63.9842 20.3056 63.8136 21.0649C63.7365 21.4085 63.7911 21.7406 64.0106 22.0251L64.6534 22.8576C64.9987 23.3053 65.0447 23.6813 64.6764 24.1163L64.0511 24.8548C63.8335 25.1118 63.7685 25.4331 63.8374 25.7554C64.0005 26.5185 64.2878 27.2715 63.5789 27.6009C63.339 27.7125 63.0801 27.7876 62.8127 27.8731L65.429 32.1706L65.5006 32.3335H65.5002ZM62.8037 23.4425C62.8037 20.3722 60.1987 17.883 56.9848 17.883C53.7709 17.883 51.1663 20.3722 51.1663 23.4425C51.1663 26.5129 53.7713 29.0021 56.9852 29.0021C60.1991 29.0021 62.8041 26.5129 62.8041 23.4425H62.8037Z" fill="#02BBBC" />
      <path d="M61.8999 23.4418C61.8999 26.0355 59.699 28.1383 56.9846 28.1383C54.2702 28.1383 52.0693 26.0358 52.0693 23.4418C52.0693 20.8478 54.2702 18.7454 56.9846 18.7454C59.699 18.7454 61.8999 20.8478 61.8999 23.4418ZM57.5445 25.7287L58.6953 26.2917C58.763 26.3248 58.9258 26.314 58.9787 26.2723C59.0317 26.2307 59.0901 26.0998 59.078 26.0277L58.8725 24.7846C58.823 24.4856 58.953 24.0937 59.1761 23.8799L60.1125 22.9833C60.1666 22.9313 60.2043 22.7799 60.1798 22.7126C60.1568 22.6498 60.0471 22.5639 59.9649 22.5516L58.6743 22.3556C58.3667 22.3088 58.0132 22.0782 57.8707 21.8127L57.2614 20.6767C57.2213 20.602 57.0886 20.5224 57.015 20.5254C56.9496 20.528 56.8223 20.6009 56.7884 20.6641L56.1799 21.8001C56.0366 22.0675 55.6916 22.3047 55.381 22.3523L54.0639 22.5542C53.9864 22.5661 53.8793 22.6572 53.8583 22.7175C53.8373 22.7777 53.8688 22.9272 53.9206 22.9763L54.841 23.8505C55.0773 24.0751 55.2198 24.4707 55.1664 24.7905L54.9624 26.0213C54.9488 26.1024 55.0111 26.2422 55.0718 26.2783C55.1259 26.3103 55.2755 26.3248 55.3358 26.295L56.4427 25.7488C56.758 25.5933 57.2135 25.5666 57.5448 25.7287H57.5445Z" fill="#02BBBC" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="83.5 110 18 18.43" className="h-[18.43px] w-[18px]" aria-hidden="true">
      <path d="M101.5 119.217C101.491 124.336 97.4734 128.434 92.4742 128.425C87.5214 128.414 83.4914 124.272 83.5 119.196C83.5086 114.089 87.5438 109.984 92.5379 110C97.525 110.016 101.509 114.114 101.5 119.217ZM91.5515 120.583C90.9179 119.933 90.3361 119.33 89.749 118.732C89.1861 118.159 88.4734 118.112 88 118.607C87.5025 119.125 87.5404 119.807 88.1067 120.393C88.9434 121.256 89.7835 122.116 90.6236 122.975C91.2158 123.579 91.863 123.576 92.4673 122.966C93.0474 122.379 93.6224 121.785 94.1991 121.195C95.1098 120.262 96.0256 119.331 96.9311 118.396C97.4786 117.83 97.5061 117.142 97.0189 116.64C96.5283 116.134 95.8621 116.164 95.3095 116.716C95.2269 116.797 95.1459 116.881 95.0668 116.964C93.9065 118.159 92.7462 119.353 91.5532 120.583H91.5515Z" fill="#02BBBC" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg viewBox="46.5 203 21 21" className="h-[21px] w-[21px]" aria-hidden="true">
      <path d="M61.8245 218.169L59.5061 218.181C58.8395 218.184 58.2609 218.643 58.0137 219.205C57.7267 219.856 57.8481 220.571 58.3032 221.09C58.7582 221.61 58.8931 222.317 58.5935 222.981C58.3528 223.513 57.7818 223.986 57.1429 223.998C51.8829 224.099 47.3562 220.204 46.608 215.015C46.1228 211.65 47.2804 208.251 49.7647 205.89C51.6068 204.139 54.0218 203.103 56.5786 203.008C59.241 202.91 61.8915 203.705 63.9838 205.361C64.9249 206.106 65.7242 207.002 66.3275 208.04C67.1308 209.423 67.5563 210.989 67.4939 212.579C67.3737 215.636 64.8887 218.085 61.8245 218.169ZM55.834 207.082C55.834 206.115 55.0506 205.332 54.0839 205.332C53.1172 205.332 52.3337 206.115 52.3337 207.082C52.3337 208.049 53.1172 208.833 54.0839 208.833C55.0506 208.833 55.834 208.049 55.834 207.082ZM61.6696 207.082C61.6696 206.115 60.8858 205.331 59.9191 205.331C58.9524 205.331 58.1686 206.115 58.1686 207.082C58.1686 208.049 58.9524 208.833 59.9191 208.833C60.8858 208.833 61.6696 208.049 61.6696 207.082ZM52.3337 211.752C52.3337 210.785 51.5502 210.001 50.5838 210.001C49.6174 210.001 48.8339 210.785 48.8339 211.752C48.8339 212.719 49.6174 213.502 50.5838 213.502C51.5502 213.502 52.3337 212.719 52.3337 211.752ZM65.169 211.752C65.169 210.785 64.3856 210.001 63.4189 210.001C62.4522 210.001 61.6687 210.785 61.6687 211.752C61.6687 212.719 62.4522 213.502 63.4189 213.502C64.3856 213.502 65.169 212.719 65.169 211.752Z" fill="#02BBBC" />
    </svg>
  );
}

type FeatureIcon = {
  render: ReactNode;
  /** tamaño natural del icono (para centrarlo dentro del círculo automáticamente) */
  size: { width: number; height: number };
  title: string;
  description: ReactNode;
};

const FEATURE_ICONS: FeatureIcon[] = [
  {
    render: <BadgeIcon />,
    size: { width: 17, height: 19 },
    title: "Diseño premium",
    description: (
      <>
        Acabados de <span className="font-bold">alta calidad</span>.
      </>
    ),
  },
  {
    render: <CheckIcon />,
    size: { width: 18, height: 18.43 },
    title: "Todo en uno",
    description: "Diseña, cotiza y compra.",
  },
  {
    render: <PaletteIcon />,
    size: { width: 21, height: 21 },
    title: "100% personalizable",
    description: (
      <>
        <span className="font-bold">Hazlo</span> a tu manera.
      </>
    ),
  },
];

// Espacio interno reservado arriba de cada fila (dentro del foreignObject) para que
// TEXT_TOP pueda ir muy negativo sin recortarse contra el borde del foreignObject.
const ROW_TOP_OFFSET = 300;
// Contenedor del foreignObject: muy generoso a propósito para que los rangos ampliados
// de los controles (ver SLIDERS) quepan sin recortarse; no es editable, es solo el lienzo.
const FO_WIDTH = 1200;
const FO_HEIGHT = 1000;

// Tamaño real de la tarjeta (el viewBox del <svg> maestro en page.tsx, "Rectangle 33").
// Cualquier círculo cuyo top/bottom quede fuera de este rango en Y se recorta y
// desaparece, aunque en el editor la fila exista más abajo en el documento.
const CARD_WIDTH = 714;
const CARD_HEIGHT = 753;

type Geometry = {
  foX: number;
  foY: number;
  lineWidth: number;
  circleSize: number;
  circleToTextGap: number;
  textTop: number;
  textOffsetX: number;
  rowHeight: number;
};

const DEFAULT_GEOMETRY: Geometry = {
  foX: 390,
  foY: 204, // 504 (posición absoluta real) - ROW_TOP_OFFSET(300) = 204
  lineWidth: 65,
  circleSize: 36.5,
  circleToTextGap: 20,
  textTop: -14,
  textOffsetX: 0,
  rowHeight: 94.5,
};

// Rangos muy amplios (±1000px) a propósito: ningún control debe volver a topar con su
// límite. El paso del slider es más grueso (movimientos rápidos); para precisión fina
// se usa el campo numérico o los botones -10/-1/+1/+10 de cada fila.
const SLIDERS: { key: keyof Geometry; label: string; min: number; max: number; step: number }[] = [
  { key: "foX", label: "Posición X del grupo", min: -1000, max: 1000, step: 1 },
  { key: "foY", label: "Posición Y del grupo", min: -1000, max: 1000, step: 1 },
  { key: "lineWidth", label: "Longitud de la línea", min: -1000, max: 1000, step: 1 },
  { key: "circleSize", label: "Tamaño del círculo", min: -1000, max: 1000, step: 1 },
  { key: "circleToTextGap", label: "Espacio círculo → texto", min: -1000, max: 1000, step: 1 },
  { key: "textTop", label: "Texto arriba/abajo (vs. centro del icono)", min: -1000, max: 1000, step: 1 },
  { key: "textOffsetX", label: "Texto izquierda/derecha (extra)", min: -1000, max: 1000, step: 1 },
  { key: "rowHeight", label: "Separación vertical entre beneficios", min: -1000, max: 1000, step: 1 },
];

const STORAGE_KEY = "destacaFeaturesEditor";

/** Filas cuyo círculo queda total o parcialmente fuera del alto/ancho real de la tarjeta. */
function getOverflowingRows(values: Geometry): number[] {
  const out: number[] = [];
  FEATURE_ICONS.forEach((_, i) => {
    const top = values.foY + ROW_TOP_OFFSET + i * values.rowHeight;
    const bottom = top + values.circleSize;
    const left = values.foX + values.lineWidth;
    const right = left + values.circleSize;
    if (top < 0 || bottom > CARD_HEIGHT || left < 0 || right > CARD_WIDTH) {
      out.push(i);
    }
  });
  return out;
}

function EditorPanel({ values, setValues }: { values: Geometry; setValues: (v: Geometry) => void }) {
  const [copied, setCopied] = useState(false);
  const [cardRect, setCardRect] = useState<{ top: number; left: number; width: number; height: number } | null>(
    null
  );

  useEffect(() => {
    function update() {
      const svg = document.getElementById("destaca-card-svg");
      if (svg) {
        const r = svg.getBoundingClientRect();
        setCardRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    // recalcula también en cada frame corto por si el layout se mueve al cambiar valores
    const interval = window.setInterval(update, 250);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(interval);
    };
  }, []);

  const overflowingRows = getOverflowingRows(values);

  const copyValues = () => {
    const code = [
      "// Valores copiados desde el editor visual (?editDestaca=1)",
      `foX = ${values.foX}`,
      `foY = ${values.foY}`,
      `lineWidth = ${values.lineWidth}`,
      `circleSize = ${values.circleSize}`,
      `circleToTextGap = ${values.circleToTextGap}`,
      `textTop = ${values.textTop}`,
      `textOffsetX = ${values.textOffsetX}`,
      `rowHeight = ${values.rowHeight}`,
    ].join("\n");
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const reset = () => {
    setValues(DEFAULT_GEOMETRY);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      {cardRect &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: cardRect.top,
              left: cardRect.left,
              width: cardRect.width,
              height: cardRect.height,
              border: `3px dashed ${overflowingRows.length > 0 ? "#ff4d4f" : "#02BBBC"}`,
              borderRadius: 24,
              pointerEvents: "none",
              zIndex: 999998,
              boxSizing: "border-box",
            }}
          />,
          document.body
        )}
      {createPortal(
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 999999,
        width: 320,
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        background: "rgba(20, 24, 28, 0.94)",
        color: "white",
        borderRadius: 12,
        padding: 16,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Editor: bloque de beneficios</div>
      <div style={{ opacity: 0.7, marginBottom: 12, lineHeight: 1.4 }}>
        Ajusta con el slider, el campo numérico o los botones. El borde punteado sobre la
        tarjeta marca su límite real: lo que quede fuera se recorta y no se ve. Se guarda
        automáticamente en este navegador.
      </div>
      {overflowingRows.length > 0 && (
        <div
          style={{
            background: "rgba(255,77,79,0.18)",
            border: "1px solid #ff4d4f",
            borderRadius: 8,
            padding: "8px 10px",
            marginBottom: 12,
            lineHeight: 1.4,
          }}
        >
          ⚠️ {overflowingRows.map((i) => `"${FEATURE_ICONS[i].title}"`).join(" y ")}{" "}
          {overflowingRows.length > 1 ? "quedan" : "queda"} fuera del borde de la tarjeta y no{" "}
          {overflowingRows.length > 1 ? "se verán" : "se verá"} en la página. Ajusta &quot;Posición
          Y del grupo&quot; o &quot;Separación vertical entre beneficios&quot; hasta que el borde
          punteado quede verde.
        </div>
      )}
      {SLIDERS.map((s) => {
        const bumpButtonStyle: CSSProperties = {
          background: "rgba(255,255,255,0.08)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 6,
          padding: "4px 6px",
          fontSize: 12,
          cursor: "pointer",
          minWidth: 30,
        };
        const bump = (delta: number) =>
          setValues({ ...values, [s.key]: Math.round((values[s.key] + delta) * 10) / 10 });
        return (
          <div key={s.key} style={{ marginBottom: 14 }}>
            <div style={{ marginBottom: 4 }}>{s.label}</div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={values[s.key]}
              onChange={(e) => setValues({ ...values, [s.key]: parseFloat(e.target.value) })}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
              <button onClick={() => bump(-10)} style={bumpButtonStyle}>
                -10
              </button>
              <button onClick={() => bump(-1)} style={bumpButtonStyle}>
                -1
              </button>
              <input
                type="number"
                value={values[s.key]}
                onChange={(e) =>
                  setValues({ ...values, [s.key]: e.target.value === "" ? 0 : parseFloat(e.target.value) })
                }
                style={{
                  width: 68,
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 6,
                  padding: "4px 6px",
                  fontSize: 13,
                  textAlign: "center",
                }}
              />
              <button onClick={() => bump(1)} style={bumpButtonStyle}>
                +1
              </button>
              <button onClick={() => bump(10)} style={bumpButtonStyle}>
                +10
              </button>
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={copyValues}
          style={{
            flex: 1,
            background: "#02BBBC",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "8px 10px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "¡Copiado!" : "Copiar valores"}
        </button>
        <button
          onClick={reset}
          style={{
            background: "transparent",
            color: "white",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 8,
            padding: "8px 10px",
            cursor: "pointer",
          }}
        >
          Restablecer
        </button>
      </div>
      <div style={{ opacity: 0.55, marginTop: 10, lineHeight: 1.4 }}>
        Cuando termines, pega &quot;Copiar valores&quot; en el chat para dejarlo fijo y publicar.
      </div>
    </div>,
    document.body
      )}
    </>
  );
}

export default function DestacaFeatures() {
  const [editMode, setEditMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [values, setValues] = useState<Geometry>(DEFAULT_GEOMETRY);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    if (params.get("editDestaca") === "1") {
      setEditMode(true);
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setValues({ ...DEFAULT_GEOMETRY, ...JSON.parse(saved) });
        } catch {
          // ignora JSON inválido y usa los valores por defecto
        }
      }
    }
  }, []);

  useEffect(() => {
    if (editMode && mounted) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    }
  }, [values, editMode, mounted]);

  const { foX, foY, lineWidth, circleSize, circleToTextGap, textTop, textOffsetX, rowHeight } = values;
  const lineTop = (circleSize - 2) / 2;
  const circleLeft = lineWidth; // la línea siempre termina exactamente en el borde izquierdo del círculo
  const textLeft = circleLeft + circleSize + circleToTextGap + textOffsetX;

  const rows = useMemo(
    () =>
      FEATURE_ICONS.map((f) => ({
        ...f,
        iconOffset: {
          left: (circleSize - f.size.width) / 2,
          top: (circleSize - f.size.height) / 2,
        },
      })),
    [circleSize]
  );

  return (
    <>
      <foreignObject x={foX} y={foY} width={FO_WIDTH} height={FO_HEIGHT}>
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {rows.map((feature, i) => (
            <div
              key={feature.title}
              className="absolute left-0"
              style={{ top: `${ROW_TOP_OFFSET + i * rowHeight}px`, width: "100%", height: `${circleSize}px` }}
            >
              <span
                className="absolute rounded-full bg-[#BBEEEC]"
                style={{ left: 0, top: `${lineTop}px`, width: `${lineWidth}px`, height: "2px" }}
                aria-hidden="true"
              />
              <span
                className="absolute rounded-full border-[0.5px] border-[#7FDED9] bg-[#BBEEEC]"
                style={{ left: `${circleLeft}px`, top: 0, width: `${circleSize}px`, height: `${circleSize}px` }}
              >
                <span
                  className="absolute rounded-full bg-[#7FDED9]/20 blur-[2px]"
                  style={{ left: -4, top: -4, right: -4, bottom: -4 }}
                  aria-hidden="true"
                />
                <span className="absolute" style={{ left: `${feature.iconOffset.left}px`, top: `${feature.iconOffset.top}px` }}>
                  {feature.render}
                </span>
              </span>
              <div className="absolute whitespace-nowrap" style={{ left: `${textLeft}px`, top: `${textTop}px` }}>
                <div className="font-sans text-base font-bold leading-none text-[#02BBBC]">{feature.title}</div>
                <div className="font-sans text-[13px] leading-tight text-[#3C3C3C]" style={{ marginTop: "4px" }}>
                  {feature.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </foreignObject>
      {mounted && editMode && <EditorPanel values={values} setValues={setValues} />}
    </>
  );
}
