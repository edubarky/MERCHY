"use client";

import { useEffect, useState } from "react";
import type { PrintTechnique } from "@/types";
import { emptyViewElements, type DesignElement, type ViewName, type ResolvedProductAssets } from "./types";
import { suggestInkCount } from "./inkSuggest";
import MiniView from "./MiniView";
import PrintTechniqueCards from "./PrintTechniqueCards";
import TechniqueDetailCard from "./TechniqueDetailCard";
import { TechniqueConfirmedRow } from "./TechniqueModal";
import PrecioDesglose from "./PrecioDesglose";

// Un renglón de precio de UNA técnica en UNA (color, vista) -- misma forma
// que ya usa PersonalizerClient (ver TechniqueResult ahí), solo que aquí
// llega ya calculado. Estructuralmente compatible con lo que regresa
// computeDesignPricing (trae más campos, pero eso no estorba).
interface TechniqueResultLike {
  technique: PrintTechnique;
  unitPrice: number | null;
  needsQuote: boolean;
  resumen: string;
}

export interface ViewPricingSlot {
  dk: string;
  view: ViewName;
  viewLabel: string;
  qty: number;
  logos: DesignElement[];
  pricing: {
    posiciones: number;
    allLogoElements: DesignElement[];
    techniqueResults: TechniqueResultLike[];
  };
}

// Paso "Selecciona el Tipo de impresión", ahora por VISTA en vez de una
// sola vez para todo el producto (ver charla 2026-09-25: "solo 1 técnica
// por Vista"). Entra después de que el cliente terminó de diseñar y dio
// "Siguiente" en el paso 3 -- un renglón por cada (Color × Vista, si
// "Distinto por color" está activo) que sí tenga diseño, con su propio
// selector de técnica, y el mismo resumen de precio de siempre sumando
// todas las vistas.
export default function TechniqueStep({
  slots,
  techniques,
  resolvedAssets,
  garmentColorForDk,
  colorLabelForDk,
  distintoPorColor,
  selectedTechniqueByView,
  onToggleTechnique,
  onEditTintas,
  techniqueLogoSizeCm,
  onLogoSizeCmChange,
  suggestedSizeCm,
  selectedElementId,
  onSelectLogo,
  productName,
  garmentUnit,
  quantity,
  total,
  incomplete,
}: {
  slots: ViewPricingSlot[];
  techniques: PrintTechnique[];
  resolvedAssets: ResolvedProductAssets;
  garmentColorForDk: (dk: string) => string;
  colorLabelForDk: (dk: string) => string;
  distintoPorColor: boolean;
  selectedTechniqueByView: Record<string, string>;
  onToggleTechnique: (dk: string, view: ViewName, techniqueId: string) => void;
  onEditTintas: (dk: string, view: ViewName, techniqueId: string) => void;
  techniqueLogoSizeCm: Record<string, Record<string, { largo: string; alto: string }>>;
  onLogoSizeCmChange: (techniqueId: string, elementId: string, patch: Partial<{ largo: string; alto: string }>) => void;
  suggestedSizeCm: Record<string, { largo: string; alto: string } | null>;
  selectedElementId: string | null;
  onSelectLogo: (dk: string, view: ViewName, elementId: string) => void;
  productName: string;
  garmentUnit: number;
  quantity: number;
  total: number;
  incomplete: boolean;
}) {
  // Conteo automático de colores por vista (ver inkSuggest.ts) -- mismo
  // cálculo que ya usaba TechniqueModal para sugerir tintas, ahora también
  // como dato informativo directo en cada renglón ("X colores"), antes de
  // siquiera elegir técnica.
  const [colorCountByKey, setColorCountByKey] = useState<Record<string, number | null>>({});
  const slotKey = (s: ViewPricingSlot) => `${s.dk}:${s.view}`;
  const logoKey = slots.map((s) => `${slotKey(s)}=${s.logos.map((l) => l.id).join(",")}`).join("|");
  useEffect(() => {
    let cancelled = false;
    slots.forEach((s) => {
      const key = slotKey(s);
      const srcs = s.logos.map((l) => l.src ?? "").filter(Boolean);
      suggestInkCount(srcs).then((n) => {
        if (!cancelled) setColorCountByKey((prev) => ({ ...prev, [key]: n }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoKey]);

  // Agrupa por color (dk) para el encabezado -- solo se muestra cuando
  // "Distinto por color" está activo, un producto de un solo color no
  // necesita repetir su nombre en cada renglón.
  const dks = Array.from(new Set(slots.map((s) => s.dk)));

  // Todos los TechRow (uno por cada técnica ya elegida en alguna vista) --
  // para el Desglose de precio de abajo, mismo componente de siempre.
  const allTechRows = slots.flatMap((s) =>
    s.pricing.techniqueResults.map((r) => ({
      technique: r.technique,
      unitPrice: r.unitPrice,
      needsQuote: r.needsQuote,
      resumen: `${s.viewLabel}${distintoPorColor ? ` · ${colorLabelForDk(s.dk)}` : ""} · ${r.resumen}`,
    }))
  );
  const anyNeedsQuote = allTechRows.some((r) => r.needsQuote);

  if (!slots.length) {
    return <p className="text-sm text-ui-gray">Todavía no diseñaste ninguna vista -- regresa a &ldquo;Atrás&rdquo; para agregar un logo o texto.</p>;
  }

  return (
    <div className="space-y-6">
      {dks.map((dk) => (
        <div key={dk} className="space-y-4">
          {distintoPorColor && (
            <p className="text-xs font-bold uppercase tracking-wide text-ui-gray">{colorLabelForDk(dk)}</p>
          )}
          {slots
            .filter((s) => s.dk === dk)
            .map((slot) => {
              const key = slotKey(slot);
              const selectedId = selectedTechniqueByView[key];
              const selectedTechnique = selectedId ? techniques.find((t) => t.id === selectedId) ?? null : null;
              const result = slot.pricing.techniqueResults[0] ?? null;
              const colorCount = colorCountByKey[key];
              return (
                <div key={key} className="rounded-2xl border border-ui-border bg-gray-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-16 shrink-0 overflow-hidden rounded-xl border border-ui-border bg-white">
                      <MiniView
                        view={slot.view}
                        elements={{ ...emptyViewElements(), [slot.view]: slot.logos }}
                        resolvedAssets={resolvedAssets}
                        garmentColor={garmentColorForDk(dk)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold text-foreground">{slot.viewLabel}</p>
                      <p className="text-xs text-ui-gray">
                        {slot.logos.length} {slot.logos.length === 1 ? "logo" : "logos"} · {slot.pricing.posiciones}{" "}
                        {slot.pricing.posiciones === 1 ? "posición" : "posiciones"}
                        {colorCount != null && ` · ${colorCount} ${colorCount === 1 ? "color" : "colores"} (automático)`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 -mx-1">
                    <PrintTechniqueCards
                      techniques={techniques}
                      selectedIds={selectedId ? [selectedId] : []}
                      onToggle={(id) => onToggleTechnique(dk, slot.view, id)}
                    />
                  </div>

                  {selectedTechnique &&
                    (selectedTechnique.pricing_type === "by_tintas" ? (
                      <div className="mt-3">
                        <TechniqueConfirmedRow
                          technique={selectedTechnique}
                          resumen={result?.resumen ?? ""}
                          unitPrice={result?.unitPrice ?? null}
                          needsQuote={result?.needsQuote ?? true}
                          onEdit={() => onEditTintas(dk, slot.view, selectedTechnique.id)}
                          onRemove={() => onToggleTechnique(dk, slot.view, selectedTechnique.id)}
                        />
                      </div>
                    ) : (
                      <div className="mt-3">
                        <TechniqueDetailCard
                          technique={selectedTechnique}
                          unitPrice={result?.unitPrice ?? null}
                          needsQuote={result?.needsQuote ?? true}
                          logosByView={[{ view: slot.view, viewLabel: slot.viewLabel, logos: slot.logos }]}
                          logoSizeCm={techniqueLogoSizeCm[selectedTechnique.id] ?? {}}
                          suggestedSizeCm={suggestedSizeCm}
                          onLogoSizeCmChange={(elementId, patch) => onLogoSizeCmChange(selectedTechnique.id, elementId, patch)}
                          selectedElementId={selectedElementId}
                          onSelectLogo={(view, elementId) => onSelectLogo(dk, view, elementId)}
                          tintas=""
                          onTintasChange={() => {}}
                          onRemove={() => onToggleTechnique(dk, slot.view, selectedTechnique.id)}
                        />
                      </div>
                    ))}
                </div>
              );
            })}
        </div>
      ))}

      {allTechRows.length > 0 && (
        <PrecioDesglose
          productName={productName}
          garmentUnit={garmentUnit}
          techniqueResults={allTechRows}
          quantity={quantity}
          total={total}
          anyTechniqueNeedsQuote={anyNeedsQuote || incomplete}
        />
      )}
    </div>
  );
}
