"use client";

import type { DesignElement } from "./types";

const FONT_OPTIONS = ["DM Sans", "Arial", "Georgia", "Courier New", "Times New Roman"];

function ToolbarIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-all duration-150 ease-out hover:scale-110 hover:bg-teal-light"
    >
      {children}
    </button>
  );
}

export default function SelectionToolbar({
  element,
  onChange,
  onDuplicate,
  onDelete,
  onBringFront,
  onSendBack,
}: {
  element: DesignElement;
  onChange: (id: string, patch: Partial<DesignElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringFront: () => void;
  onSendBack: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ui-border bg-white/95 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      {element.type === "text" && (
        <>
          <select
            value={element.fontFamily || "DM Sans"}
            onChange={(e) => onChange(element.id, { fontFamily: e.target.value })}
            className="rounded-full border border-ui-border bg-white px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <input
            type="color"
            value={element.color || "#1a1a1a"}
            onChange={(e) => onChange(element.id, { color: e.target.value })}
            title="Color"
            className="h-7 w-7 cursor-pointer rounded-full border border-ui-border p-0.5"
          />

          <ToolbarIconButton label="Negrita" onClick={() => onChange(element.id, { bold: !element.bold })}>
            <span className={`text-sm ${element.bold ? "font-bold text-primary" : "font-bold text-ui-gray"}`}>B</span>
          </ToolbarIconButton>

          <ToolbarIconButton label="Cursiva" onClick={() => onChange(element.id, { italic: !element.italic })}>
            <span className={`text-sm italic ${element.italic ? "text-primary" : "text-ui-gray"}`}>I</span>
          </ToolbarIconButton>

          {(["left", "center", "right"] as const).map((align) => (
            <ToolbarIconButton
              key={align}
              label={`Alinear ${align}`}
              onClick={() => onChange(element.id, { align })}
            >
              <svg
                viewBox="0 0 16 16"
                className={`h-4 w-4 ${element.align === align ? "text-primary" : "text-ui-gray"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
              >
                {align === "left" && <path d="M2 4h12M2 8h8M2 12h10" />}
                {align === "center" && <path d="M2 4h12M4 8h8M3 12h10" />}
                {align === "right" && <path d="M2 4h12M6 8h8M4 12h10" />}
              </svg>
            </ToolbarIconButton>
          ))}

          <label className="flex items-center gap-1 text-[10px] text-ui-gray">
            Espaciado
            <input
              type="number"
              step={0.5}
              value={element.letterSpacing ?? 0}
              onChange={(e) => onChange(element.id, { letterSpacing: Number(e.target.value) })}
              className="w-12 rounded-full border border-ui-border px-2 py-1 text-xs focus:outline-none focus:border-primary"
            />
          </label>
        </>
      )}

      <label className="flex items-center gap-1 text-[10px] text-ui-gray">
        Rotación
        <input
          type="number"
          value={Math.round(element.rotation)}
          onChange={(e) => onChange(element.id, { rotation: Number(e.target.value) })}
          className="w-14 rounded-full border border-ui-border px-2 py-1 text-xs focus:outline-none focus:border-primary"
        />
      </label>

      <div className="mx-1 h-6 w-px bg-ui-border" />

      <ToolbarIconButton label="Duplicar" onClick={onDuplicate}>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-ui-gray" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <rect x="6" y="6" width="10" height="10" rx="1.5" />
          <path d="M4 13.5V5.5A1.5 1.5 0 0 1 5.5 4h8" />
        </svg>
      </ToolbarIconButton>

      <ToolbarIconButton label="Traer al frente" onClick={onBringFront}>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-ui-gray" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <rect x="7" y="3" width="8" height="8" rx="1.2" />
          <rect x="5" y="9" width="8" height="8" rx="1.2" fill="white" />
        </svg>
      </ToolbarIconButton>

      <ToolbarIconButton label="Enviar atrás" onClick={onSendBack}>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-ui-gray" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <rect x="5" y="9" width="8" height="8" rx="1.2" />
          <rect x="7" y="3" width="8" height="8" rx="1.2" fill="white" />
        </svg>
      </ToolbarIconButton>

      <ToolbarIconButton label="Eliminar" onClick={onDelete}>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-accent-coral" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6 0 .6 9.2A1.5 1.5 0 0 0 8.1 16.5h3.8a1.5 1.5 0 0 0 1.5-1.3L14 6" />
        </svg>
      </ToolbarIconButton>
    </div>
  );
}