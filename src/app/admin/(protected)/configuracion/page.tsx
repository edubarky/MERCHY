"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, AdminCard, Table, Td, Btn, AdminInput } from "@/components/admin/ui";
import { formatMXN } from "@/lib/pricing";
import type { PriceTier } from "@/types";

// Costo base solo para la columna "Precio ejemplo" — un número redondo
// hace obvio el efecto del margen (60% -> $2,500, 28% -> $1,389).
const COSTO_EJEMPLO = 1000;

export default function ConfiguracionPage() {
  const supabase = createClient();

  // ---- Márgenes de utilidad (price_tiers) ----
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  // Borrador editable por fila: id -> % como texto (60, 55, ...).
  const [tierDrafts, setTierDrafts] = useState<Record<string, string>>({});
  const [savingTiers, setSavingTiers] = useState(false);
  const [tierError, setTierError] = useState("");

  async function loadTiers() {
    const { data } = await supabase.from("price_tiers").select("*").order("qty_min");
    const rows = (data ?? []) as PriceTier[];
    setTiers(rows);
    setTierDrafts(Object.fromEntries(rows.map((t) => [t.id, String(Math.round(t.margin_pct * 100))])));
  }

  useEffect(() => { loadTiers(); }, []);

  // Filas cuyo % cambió respecto a lo guardado (y es un número válido 0-99).
  const tierChanges = useMemo(() => {
    return tiers.flatMap((t) => {
      const raw = (tierDrafts[t.id] ?? "").trim();
      if (raw === "") return [];
      const pct = Number(raw);
      if (!Number.isFinite(pct) || pct < 0 || pct > 99) return [];
      if (Math.round(t.margin_pct * 100) === pct) return [];
      return [{ id: t.id, margin_pct: pct / 100 }];
    });
  }, [tiers, tierDrafts]);

  const tierDraftsInvalid = useMemo(
    () => tiers.some((t) => {
      const raw = (tierDrafts[t.id] ?? "").trim();
      const pct = Number(raw);
      return raw === "" || !Number.isFinite(pct) || pct < 0 || pct > 99;
    }),
    [tiers, tierDrafts]
  );

  async function saveTiers() {
    if (!tierChanges.length) return;
    setSavingTiers(true);
    setTierError("");
    for (const c of tierChanges) {
      const { error } = await supabase.from("price_tiers").update({ margin_pct: c.margin_pct }).eq("id", c.id);
      if (error) { setTierError(error.message); setSavingTiers(false); return; }
    }
    await loadTiers();
    setSavingTiers(false);
  }

  function precioEjemplo(pctStr: string): string {
    const pct = Number((pctStr ?? "").trim());
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) return "—";
    return `${formatMXN(COSTO_EJEMPLO)} → ${formatMXN(Math.ceil(COSTO_EJEMPLO / (1 - pct / 100)))}`;
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Configuración" subtitle="Ajustes del sistema de producción" />

      {/* Márgenes de utilidad por cantidad. El precio de venta de cada
          producto sale de costo / (1 − margen), redondeado hacia arriba
          (ver lib/pricing.getProductUnitPrice). */}
      <AdminCard>
        <div className="px-5 py-4 border-b border-ui-border flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-sm">Márgenes de utilidad</h2>
            <p className="text-xs text-ui-gray mt-0.5">El precio de venta sube según cuántas piezas se piden — a más piezas, menos margen</p>
          </div>
          {tierChanges.length > 0 && (
            <Btn size="sm" onClick={saveTiers} disabled={savingTiers || tierDraftsInvalid} className="flex-shrink-0">
              {savingTiers ? "Guardando..." : `Guardar ${tierChanges.length} cambio${tierChanges.length === 1 ? "" : "s"}`}
            </Btn>
          )}
        </div>
        {tierError && <p className="px-5 py-3 text-xs text-red-500 bg-red-50">{tierError}</p>}
        <Table headers={["Cantidad", "% de Utilidad", "Precio ejemplo"]}>
          {tiers.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <Td><span className="font-medium text-sm">{t.label} pzas</span></Td>
              <Td>
                <div className="flex items-center gap-1.5">
                  <AdminInput
                    type="number"
                    min={0}
                    max={99}
                    value={tierDrafts[t.id] ?? ""}
                    onChange={(e) => setTierDrafts((p) => ({ ...p, [t.id]: e.target.value }))}
                    className="w-20 text-sm"
                  />
                  <span className="text-ui-gray text-sm">%</span>
                </div>
              </Td>
              <Td><span className="text-xs text-ui-gray font-mono">{precioEjemplo(tierDrafts[t.id] ?? "")}</span></Td>
            </tr>
          ))}
        </Table>
      </AdminCard>
    </div>
  );
}
