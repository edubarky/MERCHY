"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, AdminCard, Table, Td, Btn, AdminInput, FieldLabel } from "@/components/admin/ui";
import { formatMXN } from "@/lib/pricing";
import type { Category, PriceTier, PrintTechnique, ShippingZone, StoreSettings, TechniquePrice } from "@/types";

// Costo base solo para la columna "Precio ejemplo" — un número redondo
// hace obvio el efecto del margen (60% -> $2,500, 28% -> $1,389).
const COSTO_EJEMPLO = 1000;

// Orden fijo (no alfabético) — las que ya tienen precio real primero, en
// el orden que pidió el usuario (ver charla 2026-09-16).
const TECNICAS_ORDEN = ["DTF Textil", "DTF UV", "Serigrafía", "Tampografía", "Grabado en Láser", "Bordado"];

type QtyRange = { qty_min: number; qty_max: number | null };

function qtyLabel(q: QtyRange): string {
  return q.qty_max != null ? `${q.qty_min}-${q.qty_max}` : `${q.qty_min}+`;
}

// Matriz para mostrar/editar price_table como en la referencia de ONPOINT:
// una fila por tamaño/número de tintas, una columna por rango de cantidad
// (los rangos son los mismos para todas las filas de una técnica). idx es
// la posición real dentro de price_table (para guardar el borrador de
// vuelta en el lugar correcto sin reordenar nada).
function buildTechniqueMatrix(priceTable: TechniquePrice[]): {
  rowKind: "size" | "tintas" | "qty";
  qtyRanges: QtyRange[];
  rows: { key: string; label: string; cells: ({ row: TechniquePrice; idx: number } | null)[] }[];
} {
  const rowGroups = new Map<string, { row: TechniquePrice; idx: number }[]>();
  const rowOrder: string[] = [];
  const qtyRanges: QtyRange[] = [];
  const qtySeen = new Set<string>();
  let rowKind: "size" | "tintas" | "qty" = "qty";

  priceTable.forEach((row, idx) => {
    const rowKey = row.size != null ? `size:${row.size}` : row.tintas != null ? `tintas:${row.tintas}` : "qty";
    if (row.size != null) rowKind = "size";
    else if (row.tintas != null) rowKind = "tintas";
    if (!rowGroups.has(rowKey)) { rowGroups.set(rowKey, []); rowOrder.push(rowKey); }
    rowGroups.get(rowKey)!.push({ row, idx });

    const qtyKey = `${row.qty_min}-${row.qty_max}`;
    if (!qtySeen.has(qtyKey)) { qtySeen.add(qtyKey); qtyRanges.push({ qty_min: row.qty_min, qty_max: row.qty_max }); }
  });
  qtyRanges.sort((a, b) => a.qty_min - b.qty_min);

  const rows = rowOrder.map((rowKey) => {
    const entries = rowGroups.get(rowKey)!;
    const label = rowKey.startsWith("size:")
      ? `${rowKey.slice(5)} cm`
      : rowKey.startsWith("tintas:")
      ? `${rowKey.slice(7)} ${Number(rowKey.slice(7)) === 1 ? "tinta" : "tintas"}`
      : "—";
    const cells = qtyRanges.map((q) => entries.find(({ row }) => row.qty_min === q.qty_min && row.qty_max === q.qty_max) ?? null);
    return { key: rowKey, label, cells };
  });

  return { rowKind, qtyRanges, rows };
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

  // ---- Envío por zona (shipping_zones) ----
  const [zones, setZones] = useState<ShippingZone[]>([]);
  // Borrador por zona: id -> {campo: texto}. El nombre y la lista de
  // estados no se editan en esta tarjeta -- son parte del diseño de la
  // zona, no un ajuste de precio/tiempo.
  type ZoneDraft = {
    standard_cost_per_box: string; express_cost_per_box: string;
    standard_dias_min: string; standard_dias_max: string;
    express_dias_min: string; express_dias_max: string;
  };
  const ZONE_FIELDS: (keyof ZoneDraft)[] = ["standard_cost_per_box", "express_cost_per_box", "standard_dias_min", "standard_dias_max", "express_dias_min", "express_dias_max"];
  const [zoneDrafts, setZoneDrafts] = useState<Record<string, ZoneDraft>>({});
  const [savingZones, setSavingZones] = useState(false);
  const [zoneError, setZoneError] = useState("");

  async function loadZones() {
    const { data } = await supabase.from("shipping_zones").select("*").order("sort_order");
    const rows = (data ?? []) as ShippingZone[];
    setZones(rows);
    setZoneDrafts(Object.fromEntries(rows.map((z) => [z.id, {
      standard_cost_per_box: String(z.standard_cost_per_box),
      express_cost_per_box: String(z.express_cost_per_box),
      standard_dias_min: String(z.standard_dias_min),
      standard_dias_max: String(z.standard_dias_max),
      express_dias_min: String(z.express_dias_min),
      express_dias_max: String(z.express_dias_max),
    }])));
  }

  // ---- Piezas por caja (categories.pzas_per_box) ----
  const [categories, setCategories] = useState<Category[]>([]);
  const [boxDrafts, setBoxDrafts] = useState<Record<string, string>>({});
  const [savingBoxes, setSavingBoxes] = useState(false);
  const [boxError, setBoxError] = useState("");

  async function loadCategories() {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    const rows = (data ?? []) as Category[];
    setCategories(rows);
    setBoxDrafts(Object.fromEntries(rows.map((c) => [c.id, String(c.pzas_per_box ?? 30)])));
  }

  // ---- Datos de contacto (store_settings, fila única) ----
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [whatsappDraft, setWhatsappDraft] = useState("");
  const [bankNameDraft, setBankNameDraft] = useState("");
  const [clabeDraft, setClabeDraft] = useState("");
  const [beneficiaryDraft, setBeneficiaryDraft] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSaved, setContactSaved] = useState(false);

  async function loadSettings() {
    const { data } = await supabase.from("store_settings").select("*").eq("id", "default").maybeSingle();
    const row = data as StoreSettings | null;
    setSettings(row);
    setEmailDraft(row?.notification_email ?? "");
    setWhatsappDraft(row?.whatsapp_number ?? "");
    setBankNameDraft(row?.transfer_bank_name ?? "");
    setClabeDraft(row?.transfer_clabe ?? "");
    setBeneficiaryDraft(row?.transfer_beneficiary ?? "");
  }

  useEffect(() => { loadTiers(); loadTechniques(); loadZones(); loadCategories(); loadSettings(); }, []);

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

  // Filas de zona cuyo borrador cambió respecto a lo guardado (y son
  // números válidos: costos >= 0, días min <= max).
  const zoneChanges = useMemo(() => {
    return zones.flatMap((z) => {
      const d = zoneDrafts[z.id];
      if (!d) return [];
      const nums = ZONE_FIELDS.map((f) => Number((d[f] ?? "").trim()));
      if (nums.some((n) => !Number.isFinite(n) || n < 0)) return [];
      const [stdCost, expCost, stdMin, stdMax, expMin, expMax] = nums;
      if (stdMin > stdMax || expMin > expMax) return [];
      const changed = ZONE_FIELDS.some((f) => Number(d[f]) !== z[f]);
      return changed ? [{ id: z.id, standard_cost_per_box: stdCost, express_cost_per_box: expCost, standard_dias_min: stdMin, standard_dias_max: stdMax, express_dias_min: expMin, express_dias_max: expMax }] : [];
    });
  }, [zones, zoneDrafts]);

  const zoneDraftsInvalid = useMemo(
    () => zones.some((z) => {
      const d = zoneDrafts[z.id];
      if (!d) return false;
      const nums = ZONE_FIELDS.map((f) => Number((d[f] ?? "").trim()));
      if (nums.some((n, i) => (d[ZONE_FIELDS[i]] ?? "").trim() === "" || !Number.isFinite(n) || n < 0)) return true;
      return nums[2] > nums[3] || nums[4] > nums[5];
    }),
    [zones, zoneDrafts]
  );

  async function saveZones() {
    if (!zoneChanges.length) return;
    setSavingZones(true);
    setZoneError("");
    for (const c of zoneChanges) {
      const { id, ...fields } = c;
      const { error } = await supabase.from("shipping_zones").update(fields).eq("id", id);
      if (error) { setZoneError(error.message); setSavingZones(false); return; }
    }
    await loadZones();
    setSavingZones(false);
  }

  // Filas de categoría cuyo "pzas por caja" cambió (entero positivo válido).
  const boxChanges = useMemo(() => {
    return categories.flatMap((c) => {
      const raw = (boxDrafts[c.id] ?? "").trim();
      if (raw === "") return [];
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return [];
      if ((c.pzas_per_box ?? 30) === n) return [];
      return [{ id: c.id, pzas_per_box: n }];
    });
  }, [categories, boxDrafts]);

  const boxDraftsInvalid = useMemo(
    () => categories.some((c) => {
      const raw = (boxDrafts[c.id] ?? "").trim();
      const n = Number(raw);
      return raw === "" || !Number.isFinite(n) || n <= 0 || !Number.isInteger(n);
    }),
    [categories, boxDrafts]
  );

  async function saveBoxes() {
    if (!boxChanges.length) return;
    setSavingBoxes(true);
    setBoxError("");
    for (const c of boxChanges) {
      const { error } = await supabase.from("categories").update({ pzas_per_box: c.pzas_per_box }).eq("id", c.id);
      if (error) { setBoxError(error.message); setSavingBoxes(false); return; }
    }
    await loadCategories();
    setSavingBoxes(false);
  }

  const contactChanged =
    (settings?.notification_email ?? "") !== emailDraft.trim() ||
    (settings?.whatsapp_number ?? "") !== whatsappDraft.trim() ||
    (settings?.transfer_bank_name ?? "") !== bankNameDraft.trim() ||
    (settings?.transfer_clabe ?? "") !== clabeDraft.trim() ||
    (settings?.transfer_beneficiary ?? "") !== beneficiaryDraft.trim();
  const contactInvalid =
    (emailDraft.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDraft.trim())) ||
    (clabeDraft.trim() !== "" && clabeDraft.trim().length !== 18);

  async function saveContact() {
    if (!contactChanged || contactInvalid) return;
    setSavingContact(true);
    setContactError("");
    const { data, error } = await supabase
      .from("store_settings")
      .upsert({
        id: "default",
        notification_email: emailDraft.trim() || null,
        whatsapp_number: whatsappDraft.trim() || null,
        transfer_bank_name: bankNameDraft.trim() || null,
        transfer_clabe: clabeDraft.trim() || null,
        transfer_beneficiary: beneficiaryDraft.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    setSavingContact(false);
    if (error || !data) {
      setContactError(error?.message ?? "No se pudo confirmar el guardado.");
      return;
    }
    setSettings(data as StoreSettings);
    setContactSaved(true);
    setTimeout(() => setContactSaved(false), 1800);
  }

  function precioEjemplo(pctStr: string): string {
    const pct = Number((pctStr ?? "").trim());
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) return "—";
    return `${formatMXN(COSTO_EJEMPLO)} → ${formatMXN(Math.ceil(COSTO_EJEMPLO / (1 - pct / 100)))}`;
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Configuración" subtitle="Ajustes del sistema de producción" />

      {/* Datos de contacto -- a dónde llega el correo de notificación de
          cada pedido nuevo y el número que usa el botón de WhatsApp en
          todo el sitio (ver charla 2026-09-16). */}
      <AdminCard>
        <div className="px-5 py-4 border-b border-ui-border flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-sm">Datos de contacto</h2>
            <p className="text-xs text-ui-gray mt-0.5">A dónde llega la notificación de cada pedido y el WhatsApp que ve el cliente en el sitio</p>
          </div>
          {contactChanged && (
            <Btn size="sm" onClick={saveContact} disabled={savingContact || contactInvalid} className="flex-shrink-0">
              {savingContact ? "Guardando..." : "Guardar cambios"}
            </Btn>
          )}
        </div>
        {contactError && <p className="px-5 py-3 text-xs text-red-500 bg-red-50">{contactError}</p>}
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Correo de notificación de pedidos</FieldLabel>
            <AdminInput type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="pedidos@merchy.mx" />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>WhatsApp (botón flotante del sitio)</FieldLabel>
            <AdminInput value={whatsappDraft} onChange={(e) => setWhatsappDraft(e.target.value)} placeholder="+525512345678" />
          </label>
        </div>
        <div className="px-5 pb-2">
          <p className="text-xs font-semibold text-ui-gray uppercase tracking-wider mb-3">Transferencia bancaria (se le muestra al cliente en el checkout)</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Banco</FieldLabel>
              <AdminInput value={bankNameDraft} onChange={(e) => setBankNameDraft(e.target.value)} placeholder="BBVA" />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>CLABE (18 dígitos)</FieldLabel>
              <AdminInput
                value={clabeDraft}
                onChange={(e) => setClabeDraft(e.target.value.replace(/\D/g, "").slice(0, 18))}
                placeholder="000000000000000000"
                inputMode="numeric"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Beneficiario</FieldLabel>
              <AdminInput value={beneficiaryDraft} onChange={(e) => setBeneficiaryDraft(e.target.value)} placeholder="ON POINT IMPORTADORA Y COMERCIALIZADORA" />
            </label>
          </div>
        </div>
        {contactSaved && <p className="px-5 pb-4 text-xs font-semibold text-primary-dark">✓ Guardado</p>}
      </AdminCard>

      {/* Márgenes de utilidad por cantidad. El precio de venta de cada
          producto sale de costo / (1 − margen), redondeado hacia arriba
          (ver lib/pricing.getProductUnitPrice). */}
      <AdminCard className="mt-6">
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
            const matrix = buildTechniqueMatrix(t.price_table);
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
                      {matrix.rows.length} {matrix.rows.length === 1 ? "renglón" : "renglones"}
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
                      <div className="mt-2 overflow-x-auto rounded-xl border border-ui-border">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr>
                              <th rowSpan={2} className="border-b border-r border-ui-border bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold text-ui-gray uppercase tracking-wider align-bottom">
                                {matrix.rowKind === "tintas" ? "No. de tintas" : "Medidas (cm)"}
                              </th>
                              <th colSpan={matrix.qtyRanges.length} className="border-b border-ui-border bg-primary/10 px-4 py-2 text-center text-xs font-bold text-primary-dark uppercase tracking-wider">
                                Cantidad y precio / elemento (sin IVA)
                              </th>
                            </tr>
                            <tr>
                              {matrix.qtyRanges.map((q) => (
                                <th key={qtyLabel(q)} className="border-b border-l border-ui-border bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-ui-gray whitespace-nowrap">
                                  {qtyLabel(q)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-ui-border">
                            {matrix.rows.map((r) => (
                              <tr key={r.key} className="hover:bg-gray-50">
                                <td className="border-r border-ui-border px-4 py-2 text-sm font-semibold text-foreground whitespace-nowrap">{r.label}</td>
                                {r.cells.map((cell, i) => (
                                  <td key={i} className="border-l border-ui-border px-2 py-1.5 text-center">
                                    {cell ? (
                                      <div className="relative inline-block">
                                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ui-gray">$</span>
                                        <AdminInput
                                          type="number"
                                          min={0}
                                          step="0.01"
                                          value={techDrafts[t.id]?.[cell.idx] ?? ""}
                                          onChange={(e) => updateTechPrice(t.id, cell.idx, e.target.value)}
                                          className="w-20 pl-4 text-center text-xs"
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-xs text-ui-gray">—</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
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

      {/* Envío por zona — costo estimado por caja y días de entrega según
          destino (ver lib/shipping.ts). Nombre y estados cubiertos son de
          solo lectura aquí; son el diseño de la zona, no un ajuste de
          precio. */}
      <AdminCard className="mt-6">
        <div className="px-5 py-4 border-b border-ui-border flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-sm">Envío por zona</h2>
            <p className="text-xs text-ui-gray mt-0.5">Costo estimado por caja y días de entrega según el estado de destino — se usa en el checkout</p>
          </div>
          {zoneChanges.length > 0 && (
            <Btn size="sm" onClick={saveZones} disabled={savingZones || zoneDraftsInvalid} className="flex-shrink-0">
              {savingZones ? "Guardando..." : `Guardar ${zoneChanges.length} cambio${zoneChanges.length === 1 ? "" : "s"}`}
            </Btn>
          )}
        </div>
        {zoneError && <p className="px-5 py-3 text-xs text-red-500 bg-red-50">{zoneError}</p>}
        <Table headers={["Zona", "Costo estándar/caja", "Días estándar", "Costo express/caja", "Días express"]}>
            {zones.map((z) => {
              const d = zoneDrafts[z.id] ?? { standard_cost_per_box: "", express_cost_per_box: "", standard_dias_min: "", standard_dias_max: "", express_dias_min: "", express_dias_max: "" };
              const setField = (field: keyof ZoneDraft, value: string) =>
                setZoneDrafts((p) => ({ ...p, [z.id]: { ...p[z.id], [field]: value } }));
              return (
                <tr key={z.id} className="hover:bg-gray-50">
                  <Td>
                    <span className="font-medium text-sm">{z.name}</span>
                    <p className="text-xs text-ui-gray mt-0.5">{z.cve_ent_list.length} estado{z.cve_ent_list.length === 1 ? "" : "s"}</p>
                  </Td>
                  <Td>
                    <div className="relative inline-block">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ui-gray">$</span>
                      <AdminInput type="number" min={0} step="0.01" value={d.standard_cost_per_box} onChange={(e) => setField("standard_cost_per_box", e.target.value)} className="w-20 pl-5 text-sm" />
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <AdminInput type="number" min={0} value={d.standard_dias_min} onChange={(e) => setField("standard_dias_min", e.target.value)} className="w-12 text-sm text-center" />
                      <span className="text-ui-gray text-xs">a</span>
                      <AdminInput type="number" min={0} value={d.standard_dias_max} onChange={(e) => setField("standard_dias_max", e.target.value)} className="w-12 text-sm text-center" />
                      <span className="text-ui-gray text-xs">días</span>
                    </div>
                  </Td>
                  <Td>
                    <div className="relative inline-block">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ui-gray">$</span>
                      <AdminInput type="number" min={0} step="0.01" value={d.express_cost_per_box} onChange={(e) => setField("express_cost_per_box", e.target.value)} className="w-20 pl-5 text-sm" />
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <AdminInput type="number" min={0} value={d.express_dias_min} onChange={(e) => setField("express_dias_min", e.target.value)} className="w-12 text-sm text-center" />
                      <span className="text-ui-gray text-xs">a</span>
                      <AdminInput type="number" min={0} value={d.express_dias_max} onChange={(e) => setField("express_dias_max", e.target.value)} className="w-12 text-sm text-center" />
                      <span className="text-ui-gray text-xs">días</span>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
      </AdminCard>

      {/* Piezas por caja — cuántas piezas de cada categoría caben en una
          caja de envío, usado para calcular cuántas cajas se cobran en el
          checkout (ver lib/shipping.ts countBoxes). */}
      <AdminCard className="mt-6">
        <div className="px-5 py-4 border-b border-ui-border flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-sm">Piezas por caja</h2>
            <p className="text-xs text-ui-gray mt-0.5">Cuántas piezas de cada categoría caben en una caja — determina cuántas cajas se cobran de envío</p>
          </div>
          {boxChanges.length > 0 && (
            <Btn size="sm" onClick={saveBoxes} disabled={savingBoxes || boxDraftsInvalid} className="flex-shrink-0">
              {savingBoxes ? "Guardando..." : `Guardar ${boxChanges.length} cambio${boxChanges.length === 1 ? "" : "s"}`}
            </Btn>
          )}
        </div>
        {boxError && <p className="px-5 py-3 text-xs text-red-500 bg-red-50">{boxError}</p>}
        <Table headers={["Categoría", "Piezas por caja"]}>
          {categories.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <Td><span className="font-medium text-sm">{c.name}</span></Td>
              <Td>
                <AdminInput
                  type="number"
                  min={1}
                  value={boxDrafts[c.id] ?? ""}
                  onChange={(e) => setBoxDrafts((p) => ({ ...p, [c.id]: e.target.value }))}
                  className="w-20 text-sm"
                />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminCard>
    </div>
  );
}
