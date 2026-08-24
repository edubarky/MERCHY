"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, AdminCard, FieldLabel, AdminInput, Btn, EmptyState } from "@/components/admin/ui";

// Precios de TÉCNICAS de impresión (print_techniques.price_table) —
// distinto de la futura "Tabla de precios" de PRODUCTOS (price_tiers,
// margen sobre el costo de la prenda), que todavía no tiene pantalla en
// el admin. Esta pantalla no toca price_tiers en absoluto.

interface PriceTier {
  qty_min: number;
  qty_max: number | null;
  price_per_element: number;
}

interface Technique {
  id: string;
  name: string;
  description: string | null;
  price_table: PriceTier[];
  active: boolean;
  sort_order: number;
}

interface Draft {
  name: string;
  description: string;
  price_table: PriceTier[];
}

function draftFrom(t: Technique): Draft {
  return { name: t.name, description: t.description ?? "", price_table: t.price_table.map((tier) => ({ ...tier })) };
}

function priceSummary(tiers: PriceTier[]): string | null {
  if (tiers.length === 0) return null;
  const cheapest = Math.min(...tiers.map((t) => t.price_per_element));
  return `desde $${cheapest.toFixed(2)}`;
}

export default function TecnicasPage() {
  const supabase = createClient();

  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const [addingOpen, setAddingOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);
  const [addingError, setAddingError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("print_techniques").select("*").order("sort_order");
    setTechniques((data ?? []) as Technique[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCard(t: Technique) {
    setOpenId(t.id);
    setDrafts((d) => ({ ...d, [t.id]: draftFrom(t) }));
    setErrors((e) => ({ ...e, [t.id]: null }));
    setSaved((s) => ({ ...s, [t.id]: false }));
  }

  function closeCard(id: string) {
    if (openId === id) setOpenId(null);
  }

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  function updateTier(id: string, idx: number, patch: Partial<PriceTier>) {
    setDrafts((d) => {
      const draft = d[id];
      const tiers = draft.price_table.map((t, i) => (i === idx ? { ...t, ...patch } : t));
      return { ...d, [id]: { ...draft, price_table: tiers } };
    });
  }

  function addTier(id: string) {
    setDrafts((d) => {
      const draft = d[id];
      const last = draft.price_table[draft.price_table.length - 1];
      const nextMin = last ? (last.qty_max ?? last.qty_min) + 1 : 1;
      return { ...d, [id]: { ...draft, price_table: [...draft.price_table, { qty_min: nextMin, qty_max: null, price_per_element: 0 }] } };
    });
  }

  function removeTier(id: string, idx: number) {
    setDrafts((d) => {
      const draft = d[id];
      return { ...d, [id]: { ...draft, price_table: draft.price_table.filter((_, i) => i !== idx) } };
    });
  }

  async function saveTechnique(id: string) {
    const draft = drafts[id];
    if (!draft.name.trim()) {
      setErrors((e) => ({ ...e, [id]: "El nombre es obligatorio." }));
      return;
    }
    setSaving((s) => ({ ...s, [id]: true }));
    setErrors((e) => ({ ...e, [id]: null }));
    // .select().single() is load-bearing here, not decorative: a plain
    // .update().eq(...) with no .select() returns { error: null } even
    // when RLS silently matches zero rows (e.g. no write policy for this
    // role) — Supabase only reports that as an error once you ask it to
    // hand back the row it claims to have touched. Without this, a
    // blocked write looked identical to a real save (confirmed the bug
    // reported: showed "Guardado" but reverted on reload).
    const { data, error } = await supabase
      .from("print_techniques")
      .update({
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        price_table: draft.price_table,
      })
      .eq("id", id)
      .select()
      .single();
    setSaving((s) => ({ ...s, [id]: false }));
    if (error || !data) {
      setErrors((e) => ({ ...e, [id]: error?.message ?? "No se pudo confirmar el guardado (0 filas afectadas)." }));
      return;
    }
    setTechniques((prev) => prev.map((t) => (t.id === id ? (data as Technique) : t)));
    setSaved((s) => ({ ...s, [id]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [id]: false })), 1800);
  }

  async function addTechnique() {
    if (!newName.trim()) {
      setAddingError("El nombre es obligatorio.");
      return;
    }
    setAddingSaving(true);
    setAddingError(null);
    const maxOrder = Math.max(0, ...techniques.map((t) => t.sort_order));
    const { data, error } = await supabase
      .from("print_techniques")
      .insert({ name: newName.trim(), description: null, price_table: [], active: true, sort_order: maxOrder + 1 })
      .select("*")
      .single();
    setAddingSaving(false);
    if (error) {
      setAddingError(error.message);
      return;
    }
    setTechniques((prev) => [...prev, data as Technique]);
    setNewName("");
    setAddingOpen(false);
  }

  if (loading) return <div className="p-6 text-ui-gray">Cargando...</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-start justify-between gap-6 mb-6">
        <PageHeader
          title="Técnicas de impresión"
          subtitle="Precios por cantidad para cada técnica. Estos rangos son los que usa el personalizador para cotizar automáticamente."
        />
        <Btn onClick={() => setAddingOpen((v) => !v)} className="flex-shrink-0">
          + Nueva técnica
        </Btn>
      </div>

      {addingOpen && (
        <AdminCard className="p-5 mb-4">
          <FieldLabel required>Nombre de la nueva técnica</FieldLabel>
          <div className="flex items-center gap-2">
            <AdminInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. Sublimación" className="flex-1" />
            <Btn onClick={addTechnique} disabled={addingSaving}>{addingSaving ? "Agregando..." : "Agregar"}</Btn>
            <Btn variant="secondary" onClick={() => { setAddingOpen(false); setNewName(""); setAddingError(null); }}>Cancelar</Btn>
          </div>
          {addingError && <p className="text-xs text-red-500 mt-2">{addingError}</p>}
          <p className="text-xs text-ui-gray mt-2">Se crea sin tabla de precios — se configura después, igual que las demás.</p>
        </AdminCard>
      )}

      {techniques.length === 0 ? (
        <EmptyState message="No hay técnicas de impresión configuradas todavía." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {techniques.map((t) => {
            const isOpen = openId === t.id;
            const draft = drafts[t.id];
            const summary = priceSummary(t.price_table);
            return (
              <div
                key={t.id}
                className={`bg-white border rounded-card transition-shadow duration-150 ${
                  isOpen ? "border-primary/40 shadow-[0_6px_24px_-8px_rgba(20,20,20,0.08)]" : "border-ui-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => (isOpen ? closeCard(t.id) : openCard(t))}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-foreground">{t.name}</p>
                    <p className="text-xs text-ui-gray truncate mt-0.5">{t.description ?? "Sin descripción"}</p>
                  </div>
                  {summary ? (
                    <span className="flex-shrink-0 rounded-pill border border-ui-border bg-gray-50 px-3 py-1.5 text-xs font-bold text-foreground [font-variant-numeric:tabular-nums]">
                      {summary}
                    </span>
                  ) : (
                    <span className="flex-shrink-0 rounded-pill border border-dashed border-ui-border px-3 py-1.5 text-xs font-semibold text-ui-gray">
                      Sin precio
                    </span>
                  )}
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 flex-shrink-0 text-ui-gray transition-transform duration-150 ${isOpen ? "rotate-180 text-foreground" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {isOpen && draft && (
                  <div className="px-5 pb-5 pt-1 border-t border-ui-border">
                    <div className="grid grid-cols-2 gap-4 mt-4 mb-5">
                      <div>
                        <FieldLabel required>Nombre</FieldLabel>
                        <AdminInput value={draft.name} onChange={(e) => updateDraft(t.id, { name: e.target.value })} />
                      </div>
                      <div>
                        <FieldLabel>Descripción</FieldLabel>
                        <AdminInput
                          value={draft.description}
                          onChange={(e) => updateDraft(t.id, { description: e.target.value })}
                          placeholder="Sin descripción"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-wide text-ui-gray mb-2.5">Rangos de precio</p>

                    {draft.price_table.length === 0 ? (
                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-ui-border bg-gray-50 px-4 py-3.5 mb-3">
                        <p className="text-sm text-ui-gray">
                          <span className="font-semibold text-foreground">Sin tabla de precios configurada.</span> Sigue disponible
                          para asignar a productos, pero no se puede cotizar hasta agregar al menos un rango.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 mb-3">
                        <div className="grid grid-cols-[1fr_1fr_1.2fr_28px] gap-2 px-1">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-ui-gray">Desde</span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-ui-gray">Hasta</span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-ui-gray">Precio / elemento</span>
                          <span />
                        </div>
                        {draft.price_table.map((tier, idx) => (
                          <div key={idx} className="grid grid-cols-[1fr_1fr_1.2fr_28px] gap-2 items-center bg-gray-50 border border-ui-border rounded-xl p-1.5">
                            <input
                              type="number"
                              min={1}
                              value={tier.qty_min}
                              onChange={(e) => updateTier(t.id, idx, { qty_min: parseInt(e.target.value) || 0 })}
                              className="w-full rounded-lg border border-transparent bg-white px-2.5 py-1.5 text-sm [font-variant-numeric:tabular-nums] focus:outline-none focus:border-primary"
                            />
                            <input
                              type="number"
                              min={1}
                              value={tier.qty_max ?? ""}
                              placeholder="Sin límite"
                              onChange={(e) => updateTier(t.id, idx, { qty_max: e.target.value === "" ? null : parseInt(e.target.value) || null })}
                              className="w-full rounded-lg border border-transparent bg-white px-2.5 py-1.5 text-sm [font-variant-numeric:tabular-nums] focus:outline-none focus:border-primary placeholder:text-ui-gray placeholder:text-xs"
                            />
                            <div className="relative">
                              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-ui-gray">$</span>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={tier.price_per_element}
                                onChange={(e) => updateTier(t.id, idx, { price_per_element: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-lg border border-transparent bg-white pl-5 pr-2.5 py-1.5 text-sm [font-variant-numeric:tabular-nums] focus:outline-none focus:border-primary"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTier(t.id, idx)}
                              title="Eliminar rango"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-ui-gray transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 6h16M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6m-9 0 .7 13.2A2 2 0 0 0 9.7 21h4.6a2 2 0 0 0 2-1.8L17 6" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => addTier(t.id)}
                      className="inline-flex items-center gap-1.5 rounded-pill border border-dashed border-ui-border px-3.5 py-2 text-xs font-bold text-ui-gray transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary-dark"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {draft.price_table.length === 0 ? "Agregar rango de precio" : "Agregar rango"}
                    </button>

                    {errors[t.id] && <p className="text-xs text-red-500 mt-3">Error al guardar: {errors[t.id]}</p>}

                    <div className="flex items-center gap-3 mt-5 pt-4 border-t border-ui-border">
                      <Btn onClick={() => saveTechnique(t.id)} disabled={saving[t.id]}>
                        {saving[t.id] ? "Guardando..." : "Guardar"}
                      </Btn>
                      <Btn variant="secondary" onClick={() => closeCard(t.id)}>Cancelar</Btn>
                      {saved[t.id] && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-dark">
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                          </svg>
                          Guardado
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}