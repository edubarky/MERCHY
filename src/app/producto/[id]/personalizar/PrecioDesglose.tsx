"use client";

import type { ReactNode } from "react";
import type { PrintTechnique } from "@/types";
import { formatMXN, splitIva } from "@/lib/pricing";

// Desglose de precio estilo ONPOINT (charla 2026-09-10): renglones CON
// IVA (producto + cada técnica), luego "Precio por pieza", y el Total
// partido en Subtotal (sin IVA) + IVA 16%. El Total es el ancla real (lo
// que se cobra); Subtotal e IVA se sacan de él (Total ÷ 1.16), así el IVA
// queda como exactamente 16% del subtotal.

interface TechRow {
  technique: PrintTechnique;
  unitPrice: number | null; // ya con IVA
  needsQuote: boolean;
  resumen: string;
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 text-[13.5px] ${strong ? "font-display font-bold" : ""}`}>
      <span className="text-ui-gray">{label}</span>
      <span className={`shrink-0 tabular-nums ${muted ? "text-ui-gray" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

export default function PrecioDesglose({
  productName,
  garmentUnit,
  techniqueResults,
  quantity,
  total,
  anyTechniqueNeedsQuote,
}: {
  productName: string;
  garmentUnit: number;
  techniqueResults: TechRow[];
  quantity: number;
  total: number;
  anyTechniqueNeedsQuote: boolean;
}) {
  const { subtotal, iva } = splitIva(total);
  const piezaConIva = garmentUnit + techniqueResults.reduce((s, r) => s + (r.unitPrice ?? 0), 0);

  return (
    <div className="rounded-2xl border border-ui-border bg-white p-5">
      <p className="mb-2 font-display text-[13px] font-semibold uppercase tracking-wider text-ui-gray">Desglose</p>

      <Row label={<>Producto · {productName}</>} value={formatMXN(garmentUnit)} />
      {techniqueResults.map((r) => (
        <Row
          key={r.technique.id}
          label={
            <>
              {r.technique.name}
              {r.resumen ? ` · ${r.resumen}` : ""}
            </>
          }
          value={
            r.needsQuote || r.unitPrice === null ? (
              <span className="font-semibold text-accent-coral">Por cotizar</span>
            ) : (
              formatMXN(r.unitPrice)
            )
          }
        />
      ))}

      <div className="my-2 h-px bg-foreground/15" />

      {anyTechniqueNeedsQuote ? (
        <>
          <Row label="Precio por pieza" value={<span className="text-accent-coral">Por cotizar</span>} strong />
          <p className="mt-1 text-[11px] text-ui-gray">Completa los datos de la técnica para ver el total.</p>
        </>
      ) : (
        <>
          <Row label="Precio por pieza" value={formatMXN(piezaConIva)} strong />
          <Row label="Cantidad" value={`× ${quantity.toLocaleString("es-MX")} ${quantity === 1 ? "pieza" : "piezas"}`} muted />
          <div className="my-2 h-px bg-ui-border" />
          <Row label={<>Subtotal <span className="text-[11px] text-ui-gray">(sin IVA)</span></>} value={formatMXN(subtotal)} muted />
          <Row label="IVA 16%" value={formatMXN(iva)} muted />
          <div className="my-2 h-px bg-foreground/15" />
          <div className="flex items-baseline justify-between gap-3 py-1 font-display text-[17px] font-bold text-foreground">
            <span>Total</span>
            <span className="tabular-nums">{formatMXN(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}
