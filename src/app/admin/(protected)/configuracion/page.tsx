"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, AdminCard, Table, Td, Btn, AdminInput } from "@/components/admin/ui";
import { formatMXN } from "@/lib/pricing";
import type { PriceTier, PrintTechnique, TechniquePrice } from "@/types";

// Costo base solo para la columna "Precio ejemplo" — un número redondo
// hace obvio el efecto del margen (60% -> $2,500, 28% -> $1,389).
const COSTO_EJEMPLO = 1000;

// Orden fijo (no alfabético) — las que ya tienen precio real primero, en
// el orden que pidió el usuario (ver charla 2026-09-16).
const TECNICAS_ORDEN = ["DTF Textil", "DTF UV", "Serigrafía", "Tampografía", "Grabado en Láser", "Bordado"];

// Cada renglón de price_table trae su propio "size" o "tintas" — para
// mostrarlo agrupado (una sub-tabla por tamaño/número de tintas) en vez de
// una sola lista plana donde esa dimensión se perdería de vista. idx es la
// posición real dentro de price_table (para poder guardar el borrador de
// vuelta en el lugar correcto sin reordenar nada).
function groupPriceRows(priceTable: TechniquePrice[]): { key: string; label: string; rows: { row: TechniquePrice; idx: number }[] }[] {
  const groups = new Map<string, { row: TechniquePrice; idx: number }[]>();
  const order: string[] = [];
  priceTable.forEach((row, idx) => {
    const key = row.size != null ? `size:${row.size}` : row.tintas != null ? `tintas:${row.tintas}` : "qty";
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key)!.push({ row, idx });
  });
  return order.map((key) => {
    const rows = groups.get(key)!;
    const label = key.startsWith("size:")
      ? `${key.slice(5)} cm`
      : key.startsWith("tintas:")
      ? `${key.slice(7)} ${Number(key.slice(7)) === 1 ? "tinta" : "tintas"}`
      : "Por cantidad";
    return { key, label, rows };
  });
}

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

  // ---- Técnicas de impresión (print_techniques.price_table) ----
  const [techniques, setTechniques] = useState<PrintTechnique[]>([]);
  const [openTechId, setOpenTechId] = useState<string | null>(null);
  // Borrador por técnica: mismo orden que su price_table, solo el precio
  // como texto editable (size/tintas/cantidad no se editan aquí).
  const [techDrafts, setTechDrafts] = useState<Record<string, string[]>>({});
  const [savingTechId, setSavingTechId] = useState<string | null>(null);
  const [techErrors, setTechErrors] = useState<Record<string, string>>({});
  const [techSaved, setTechSaved] = useState<Record<string, boolean>>({});

  async function loadTechniques() {
    const { data } = await supabase.from("print_techniques").select("id, name, description, price_table, pricing_type, active, sort_order");
    const rows = (data ?? []) as PrintTechnique[];
    const ordered = TECNICAS_ORDEN.map((name) => rows.find((r) => r.name === name)).filter((r): r is PrintTechnique => !!r);
    setTechniques(ordered);
  }

  useEffect(() => { loadTiers(); loadTechniques(); }, []);

  function openTechnique(t: PrintTechnique) {
    setOpenTechId((id) => (id === t.id ? null : t.id));
    setTechDrafts((d) => ({ ...d, [t.id]: t.price_table.map((row) => String(row.price_per_element)) }));
    setTechErrors((e) => ({ ...e, [t.id]: "" }));
    setTechSaved((s) => ({ ...s, [t.id]: false }));
  }

  function updateTechPrice(techId: string, idx: number, value: string) {
    setTechDrafts((d) => ({ ...d, [techId]: (d[techId] ?? []).map((v, i) => (i === idx ? value : v)) }));
  }

  function techChangeCount(t: PrintTechnique): number {
    const draft = techDrafts[t.id];
    if (!draft) return 0;
    return t.price_table.reduce((count, row, i) => {
      const raw = (draft[i] ?? "").trim();
      const num = Number(raw);
      return raw !== "" && Number.isFinite(num) && num >= 0 && num !== row.price_per_element ? count + 1 : count;
    }, 0);
  }

  function techDraftInvalid(t: PrintTechnique): boolean {
    const draft = techDrafts[t.id];
    if (!draft) return false;
    return t.price_table.some((_, i) => {
      const raw = (draft[i] ?? "").trim();
      const num = Number(raw);
      return raw === "" || !Number.isFinite(num) || num < 0;
    });
  }

  async function saveTechnique(t: PrintTechnique) {
    const draft = techDrafts[t.id];
    if (!draft) return;
    const nextTable = t.price_table.map((row, i) => {
      const raw = (draft[i] ?? "").trim();
      const num = Number(raw);
      return Number.isFinite(num) && raw !== "" ? { ...row, price_per_element: num } : row;
    });
    setSavingTechId(t.id);
    setTechErrors((e) => ({ ...e, [t.id]: "" }));
    // .select().single() es load-bearing (mismo criterio que Estados de
    // producción antes de quitarse) — sin esto un update bloqueado por RLS
    // se ve idéntico a uno exitoso.
    const { data, error } = await supabase.from("print_techniques").update({ price_table: nextTable }).eq("id", t.id).select().single();
    setSavingTechId(null);
    if (error || !data) {
      setTechErrors((e) => ({ ...e, [t.id]: error?.message ?? "No se pudo confirmar el guardado." }));
      return;
    }
    const saved = data as PrintTechnique;
    setTechniques((prev) => prev.map((x) => (x.id === t.id ? saved : x)));
    setTechDrafts((d) => ({ ...d, [t.id]: saved.price_table.map((row) => String(row.price_per_element)) }));
    setTechSaved((s) => ({ ...s, [t.id]: true }));
    setTimeout(() => setTechSaved((s) => ({ ...s, [t.id]: false })), 1800);
  }

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

      {/* Técnicas de impresión — precio por elemento según tamaño/número de
          tintas Y cantidad total (ver lib/pricing.ts). Cada técnica se
          abre para editar; las sub-tablas agrupan por size/tintas para no
          perder esa dimensión en una sola lista plana. */}
      <AdminCard className="mt-6">
        <div className="px-5 py-4 border-b border-ui-border">
          <h2 className="font-semibold text-sm">Técnicas de impresión</h2>
          <p className="text-xs text-ui-gray mt-0.5">Precio por elemento (logo/texto) según tamaño o número de tintas y cantidad — esto es lo que usa el Personalizador para cotizar</p>
        </div>
        <div className="divide-y divide-ui-border">
          {techniques.map((t) => {
            const isOpen = openTechId === t.id;
            const changeCount = techChangeCount(t);
            const groups = groupPriceRows(t.price_table);
            return (
              <div key={t.id}>
                <button
                  type="button"
                  onClick={() => openTechnique(t)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    {t.description && <p className="text-xs text-ui-gray truncate mt-0.5">{t.description}</p>}
                  </div>
                  {t.price_table.length === 0 ? (
                    <span className="flex-shrink-0 rounded-pill border border-dashed border-ui-border px-3 py-1 text-xs font-semibold text-ui-gray">Sin precio</span>
                  ) : (
                    <span className="flex-shrink-0 rounded-pill border border-ui-border bg-gray-50 px-3 py-1 text-xs font-bold text-foreground">
                      {groups.length} {groups.length === 1 ? "tabla" : "tablas"}
                    </span>
                  )}
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 flex-shrink-0 text-ui-gray transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 bg-gray-50/60">
                    {t.price_table.length === 0 ? (
                      <p className="text-sm text-ui-gray py-3">Sin tabla de precios configurada todavía.</p>
                    ) : (
                      <div className="flex flex-col gap-4 mt-2">
                        {groups.map((g) => (
                          <div key={g.key}>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-ui-gray mb-1.5">{g.label}</p>
                            <Table headers={["Cantidad", "Precio / elemento"]}>
                              {g.rows.map(({ row, idx }) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <Td>
                                    <span className="text-sm">{row.qty_min}{row.qty_max ? `–${row.qty_max}` : "+"}</span>
                                  </Td>
                                  <Td>
                                    <div className="relative inline-block">
                                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-ui-gray">$</span>
                                      <AdminInput
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={techDrafts[t.id]?.[idx] ?? ""}
                                        onChange={(e) => updateTechPrice(t.id, idx, e.target.value)}
                                        className="w-24 pl-5 text-sm"
                                      />
                                    </div>
                                  </Td>
                                </tr>
                              ))}
                            </Table>
                          </div>
                        ))}
                      </div>
                    )}

                    {techErrors[t.id] && <p className="text-xs text-red-500 mt-3">Error al guardar: {techErrors[t.id]}</p>}

                    <div className="flex items-center gap-3 mt-4">
                      <Btn
                        size="sm"
                        onClick={() => saveTechnique(t)}
                        disabled={!changeCount || savingTechId === t.id || techDraftInvalid(t)}
                      >
                        {savingTechId === t.id ? "Guardando..." : changeCount ? `Guardar ${changeCount} cambio${changeCount === 1 ? "" : "s"}` : "Guardar"}
                      </Btn>
                      {techSaved[t.id] && <span className="text-xs font-semibold text-primary-dark">✓ Guardado</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AdminCard>
    </div>
  );
}
