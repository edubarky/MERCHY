"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PageHeader, AdminCard, FieldLabel, AdminInput, AdminTextarea,
  AdminSelect, AdminToggle, Btn, Badge, EmptyState,
} from "@/components/admin/ui";
import ImageUpload from "@/components/admin/ImageUpload";
import ViewsUpload from "@/components/admin/ViewsUpload";
import Link from "next/link";
import { getProductUnitPrice, resolveCosto, utilidadPct, formatMXN } from "@/lib/pricing";
import type { PriceTier } from "@/types";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Único"];

export default function EditProductoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"detalles" | "variantes" | "técnicas">("detalles");
  const [techniques, setTechniques] = useState<any[]>([]);
  const [selectedTechniqueIds, setSelectedTechniqueIds] = useState<string[]>([]);
  const [savingTechniques, setSavingTechniques] = useState(false);
  const [techniquesSaved, setTechniquesSaved] = useState(false);
  const [techniquesError, setTechniquesError] = useState<string | null>(null);
  const [newVariant, setNewVariant] = useState({ color_name: "", color_hex: "#000000", stock_infinite: true, stock: 0, gender: "", sizes_available: [] as string[] });
  const [addingVariant, setAddingVariant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ color_name: "", color_hex: "#000000", stock_infinite: true, stock: 0, gender: "", sizes_available: [] as string[] });
  const [savingEdit, setSavingEdit] = useState(false);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  // Todo en texto (nunca number) mientras se edita -- un number controlado
  // con parseFloat en cada tecla pierde el "." a medio escribir (ver charla
  // 2026-10-10, "no me deja hacer nada"). Se parsea solo al guardar/calcular.
  const [costoDraft, setCostoDraft] = useState("0");
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  type CostoTierRow = { qty_min: string; qty_max: string; costo: string };
  const [costoTierRows, setCostoTierRows] = useState<CostoTierRow[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: cats }, { data: sups }, { data: vars }, { data: techs }, { data: productTechs }, { data: tiers }] = await Promise.all([
        supabase.from("products").select("*, category:categories(id,name), supplier:suppliers(id,name)").eq("id", id).single(),
        supabase.from("categories").select("id, name").eq("active", true).order("sort_order"),
        supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
        supabase.from("product_variants").select("*").eq("product_id", id).order("sort_order").order("created_at"),
        supabase.from("print_techniques").select("*").order("sort_order"),
        supabase.from("product_print_techniques").select("technique_id").eq("product_id", id),
        supabase.from("price_tiers").select("*").order("qty_min"),
      ]);
      setProduct(p);
      setCategories(cats ?? []);
      setSuppliers(sups ?? []);
      setVariants(vars ?? []);
      setTechniques(techs ?? []);
      setSelectedTechniqueIds((productTechs ?? []).map((r: any) => r.technique_id));
      setPriceTiers(tiers ?? []);
      setCostoDraft(String(p?.costo ?? 0));
      const overrides = (p?.price_overrides ?? {}) as Record<string, number>;
      setPriceOverrides(Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])));
      const tierRows = (p?.costo_tiers ?? []) as { qty_min: number; qty_max: number | null; costo: number }[];
      setCostoTierRows(tierRows.map((t) => ({ qty_min: String(t.qty_min), qty_max: t.qty_max === null ? "" : String(t.qty_max), costo: String(t.costo) })));
    }
    load();
  }, [id]);

  function addCostoTierRow() {
    setCostoTierRows((prev) => [...prev, { qty_min: "", qty_max: "", costo: "" }]);
  }
  function updateCostoTierRow(i: number, field: keyof CostoTierRow, value: string) {
    setCostoTierRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function removeCostoTierRow(i: number) {
    setCostoTierRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const customSizes = (fd.get("custom_sizes") as string)
      .split(",").map((s) => s.trim()).filter(Boolean);
    const sizes = Array.from(new Set([...(fd.getAll("sizes") as string[]), ...customSizes]));
    const overridesPayload = Object.fromEntries(
      Object.entries(priceOverrides)
        .filter(([, v]) => v.trim() !== "")
        .map(([k, v]) => [k, parseFloat(v)])
        .filter(([, v]) => Number.isFinite(v))
    );
    const costoTiersPayload = costoTierRows
      .filter((r) => r.qty_min.trim() !== "" && r.costo.trim() !== "")
      .map((r) => ({
        qty_min: parseInt(r.qty_min, 10),
        qty_max: r.qty_max.trim() === "" ? null : parseInt(r.qty_max, 10),
        costo: parseFloat(r.costo),
      }))
      .filter((r) => Number.isFinite(r.qty_min) && Number.isFinite(r.costo))
      .sort((a, b) => a.qty_min - b.qty_min);
    await supabase.from("products").update({
      name: fd.get("name"),
      description: fd.get("description") || null,
      composition: fd.get("composition") || null,
      category_id: fd.get("category_id") || null,
      supplier_id: fd.get("supplier_id") || null,
      sizes_available: sizes,
      costo: parseFloat(fd.get("costo") as string),
      price_overrides: overridesPayload,
      costo_tiers: costoTiersPayload,
    }).eq("id", id);
    setSaving(false);
  }

  async function addVariant() {
    if (!newVariant.color_name.trim()) { setError("El nombre del color es obligatorio."); return; }
    setError(null);
    setAddingVariant(true);
    const { data, error: err } = await supabase
      .from("product_variants")
      .insert({
        product_id: id, ...newVariant, images: [],
        gender: newVariant.gender || null,
        sizes_available: newVariant.sizes_available.length ? newVariant.sizes_available : null,
      })
      .select("*")
      .single();
    if (err) { setError("Error al agregar variante."); setAddingVariant(false); return; }
    setVariants((prev) => [...prev, data]);
    setNewVariant({ color_name: "", color_hex: "#000000", stock_infinite: true, stock: 0, gender: "", sizes_available: [] });
    setAddingVariant(false);
  }

  async function deleteVariant(variantId: string) {
    await supabase.from("product_variants").delete().eq("id", variantId);
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
  }

  async function updateVariantImages(variantId: string, urls: string[]) {
    setVariants((prev) => prev.map((v) => v.id === variantId ? { ...v, images: urls } : v));
  }

  async function updateVariantViews(variantId: string, views: Record<string, string>) {
    setVariants((prev) => prev.map((v) => v.id === variantId ? { ...v, views } : v));
  }

  async function toggleVariantActive(variantId: string, active: boolean) {
    await supabase.from("product_variants").update({ active: !active }).eq("id", variantId);
    setVariants((prev) => prev.map((v) => v.id === variantId ? { ...v, active: !active } : v));
  }

  // Portada del producto: qué color aparece primero en la tarjeta del
  // catálogo (ver charla 2026-10-09, "¿cómo escojo la portada?"). Un
  // sort_order menor que el de todos los demás basta -- no hace falta
  // renumerar la lista completa cada vez.
  async function makeVariantCover(variantId: string) {
    const minOrder = Math.min(...variants.map((v) => v.sort_order ?? 0));
    const newOrder = minOrder - 1;
    await supabase.from("product_variants").update({ sort_order: newOrder }).eq("id", variantId);
    setVariants((prev) =>
      prev
        .map((v) => (v.id === variantId ? { ...v, sort_order: newOrder } : v))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.created_at.localeCompare(b.created_at))
    );
  }

  function startEditVariant(v: any) {
    setEditingId(v.id);
    setEditForm({
      color_name: v.color_name, color_hex: v.color_hex, stock_infinite: v.stock_infinite ?? true, stock: v.stock ?? 0,
      gender: v.gender ?? "", sizes_available: v.sizes_available ?? [],
    });
  }

  async function saveVariantEdit() {
    if (!editingId) return;
    setSavingEdit(true);
    const payload = {
      ...editForm,
      gender: editForm.gender || null,
      sizes_available: editForm.sizes_available.length ? editForm.sizes_available : null,
    };
    await supabase.from("product_variants").update(payload).eq("id", editingId);
    setVariants((prev) => prev.map((v) => v.id === editingId ? { ...v, ...payload } : v));
    setEditingId(null);
    setSavingEdit(false);
  }

  function toggleTechnique(techniqueId: string) {
    setTechniquesSaved(false);
    setSelectedTechniqueIds((prev) =>
      prev.includes(techniqueId) ? prev.filter((t) => t !== techniqueId) : [...prev, techniqueId]
    );
  }

  // Solo disponibilidad (producto <-> técnica) — el precio de cada técnica
  // vive aparte, en print_techniques.price_table, y no se toca aquí.
  // Guarda por reemplazo completo (borra todas las filas de este producto y
  // vuelve a insertar las que quedaron marcadas) — mismo nivel de
  // simplicidad que el resto de este archivo, y correcto para el tamaño de
  // esta lista (nunca son más de ~7 técnicas).
  async function saveTechniques() {
    setSavingTechniques(true);
    setTechniquesError(null);
    const { error: delErr } = await supabase.from("product_print_techniques").delete().eq("product_id", id);
    if (delErr) { setTechniquesError(delErr.message); setSavingTechniques(false); return; }
    if (selectedTechniqueIds.length > 0) {
      const { error: insErr } = await supabase.from("product_print_techniques").insert(
        selectedTechniqueIds.map((technique_id) => ({ product_id: id, technique_id }))
      );
      if (insErr) { setTechniquesError(insErr.message); setSavingTechniques(false); return; }
    }
    setSavingTechniques(false);
    setTechniquesSaved(true);
  }

  if (!product) return <div className="p-6 text-ui-gray">Cargando...</div>;

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title={product.name}
        subtitle={`SKU: ${product.sku}`}
        action={<Link href="/admin/productos"><Btn variant="secondary">← Productos</Btn></Link>}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-ui-border">
        {(["detalles", "variantes", "técnicas"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? "border-b-2 border-primary text-primary" : "text-ui-gray hover:text-foreground"}`}
          >
            {t} {t === "variantes" && `(${variants.length})`}
            {t === "técnicas" && `(${selectedTechniqueIds.length})`}
          </button>
        ))}
      </div>

      {tab === "detalles" && (
        <AdminCard className="p-5">
          <form onSubmit={saveProduct} className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {/* Columna izquierda: identidad del producto */}
            <div className="space-y-4">
              <div>
                <FieldLabel required>Nombre</FieldLabel>
                <AdminInput name="name" defaultValue={product.name} required className="text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel required>Categoría</FieldLabel>
                  <AdminSelect name="category_id" defaultValue={product.category_id ?? ""} required className="text-sm">
                    <option value="">Seleccionar...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </AdminSelect>
                </div>
                <div>
                  <FieldLabel>Proveedor</FieldLabel>
                  <AdminSelect name="supplier_id" defaultValue={product.supplier_id ?? ""} className="text-sm">
                    <option value="">Sin proveedor</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </AdminSelect>
                </div>
              </div>
              <div>
                <FieldLabel>Descripción</FieldLabel>
                <AdminTextarea name="description" defaultValue={product.description ?? ""} className="text-sm" rows={2} />
              </div>
              <div>
                <FieldLabel>Composición</FieldLabel>
                <AdminInput name="composition" defaultValue={product.composition ?? ""} className="text-sm" />
              </div>
              <div>
                <FieldLabel>Tallas disponibles</FieldLabel>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {SIZES.map((size) => (
                    <label key={size} className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" name="sizes" value={size} defaultChecked={product.sizes_available?.includes(size)} className="accent-primary w-3.5 h-3.5" />
                      <span className="text-xs">{size}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-ui-gray mt-1">Deja vacío si el producto no tiene tallas</p>
                <div className="mt-2">
                  <FieldLabel>Tallas propias (si no usa XS-XXL, ej. producto infantil)</FieldLabel>
                  <AdminInput
                    name="custom_sizes"
                    defaultValue={(product.sizes_available ?? []).filter((s: string) => !SIZES.includes(s)).join(", ")}
                    placeholder="3-4, 5-6, 7-8, 9-11, 12-14"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Columna derecha: costo y precio */}
            <div className="space-y-4">
              <div className="w-40">
                <FieldLabel required>Costo (sin IVA)</FieldLabel>
                <AdminInput
                  name="costo" type="text" inputMode="decimal" required
                  value={costoDraft}
                  onChange={(e) => setCostoDraft(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Rango de costo del proveedor: independiente de los rangos
                  de venta de abajo -- el proveedor puede dar su descuento en
                  otros cortes de cantidad (ver charla 2026-10-10). Vacío =
                  sigue usando el Costo plano de arriba para todo. */}
              <div>
                <div className="flex items-center justify-between">
                  <FieldLabel>Rango de costo del proveedor (opcional)</FieldLabel>
                  <button type="button" onClick={addCostoTierRow} className="text-xs font-semibold text-primary-dark hover:underline">
                    + Agregar rango
                  </button>
                </div>
                {costoTierRows.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-ui-border">
                    <div className="grid grid-cols-[1fr_1fr_1fr_28px] gap-2 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-ui-gray">
                      <span>Desde</span>
                      <span>Hasta</span>
                      <span>Costo</span>
                      <span />
                    </div>
                    {costoTierRows.map((row, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_28px] items-center gap-2 border-t border-ui-border px-3 py-1.5">
                        <AdminInput type="number" min="1" placeholder="1" value={row.qty_min} onChange={(e) => updateCostoTierRow(i, "qty_min", e.target.value)} className="text-sm" />
                        <AdminInput type="number" min="1" placeholder="sin límite" value={row.qty_max} onChange={(e) => updateCostoTierRow(i, "qty_max", e.target.value)} className="text-sm" />
                        <AdminInput type="text" inputMode="decimal" placeholder="0.00" value={row.costo} onChange={(e) => updateCostoTierRow(i, "costo", e.target.value)} className="text-sm" />
                        <button type="button" onClick={() => removeCostoTierRow(i)} className="text-ui-gray hover:text-red-500" aria-label="Quitar rango">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-ui-gray mt-1">Si tu proveedor te cobra distinto según cuánto le compras, agrega sus rangos aquí -- no tienen que coincidir con los rangos de venta de abajo.</p>
              </div>

              {/* Precio por rango: arranca en el cálculo automático (costo ÷
                  margen del rango, mismo criterio de siempre) pero se puede
                  sobreescribir por producto. % Utilidad se recalcula en vivo,
                  ya sin IVA (lo que de verdad queda de ganancia, no el margen
                  bruto) -- ver charla 2026-10-10. */}
              {priceTiers.length > 0 && (
                <div>
                  <FieldLabel>Precio por rango</FieldLabel>
                  <div className="overflow-hidden rounded-xl border border-ui-border">
                    <div className="grid grid-cols-[1fr_1fr_60px] gap-2 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-ui-gray">
                      <span>Rango</span>
                      <span>Precio (IVA incl.)</span>
                      <span>Utilidad</span>
                    </div>
                    {priceTiers.map((tier) => {
                      const costoNum = parseFloat(costoDraft) || 0;
                      const costoEfectivo = resolveCosto(costoNum, tier.qty_min, costoTierRows
                        .filter((r) => r.qty_min.trim() !== "" && r.costo.trim() !== "")
                        .map((r) => ({ qty_min: parseInt(r.qty_min, 10), qty_max: r.qty_max.trim() === "" ? null : parseInt(r.qty_max, 10), costo: parseFloat(r.costo) })));
                      const autoPrice = getProductUnitPrice(costoEfectivo, tier.qty_min, priceTiers);
                      const overrideRaw = priceOverrides[tier.id] ?? "";
                      const effectivePrice = overrideRaw.trim() !== "" && Number.isFinite(parseFloat(overrideRaw))
                        ? parseFloat(overrideRaw)
                        : autoPrice;
                      const utilidad = utilidadPct(effectivePrice, costoEfectivo);
                      return (
                        <div key={tier.id} className="grid grid-cols-[1fr_1fr_60px] items-center gap-2 border-t border-ui-border px-3 py-1.5">
                          <span className="text-xs">{tier.label}</span>
                          <AdminInput
                            type="number" step="1" min="0"
                            value={overrideRaw}
                            placeholder={formatMXN(autoPrice)}
                            onChange={(e) => setPriceOverrides((prev) => ({ ...prev, [tier.id]: e.target.value }))}
                            className="text-sm"
                          />
                          <span className={`text-xs font-semibold ${utilidad < 0 ? "text-red-500" : "text-foreground"}`}>
                            {(utilidad * 100).toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-ui-gray mt-1">Vacío = automático. Escribe un número para fijarlo manual en ese rango.</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 pt-2 border-t border-ui-border flex justify-end">
              <Btn type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Btn>
            </div>
          </form>
        </AdminCard>
      )}

      {tab === "variantes" && (
        <div className="space-y-4">
          {/* Existing variants */}
          {variants.map((v, variantIdx) => (
            <AdminCard key={v.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-white shadow flex-shrink-0 mt-0.5" style={{ backgroundColor: v.color_hex }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{v.color_name}</span>
                    <span className="font-mono text-xs text-ui-gray bg-gray-100 px-2 py-0.5 rounded">{v.sku}</span>
                    {!v.active && <Badge color="#9CA3AF">Inactivo</Badge>}
                    {variantIdx === 0 && <Badge color="#30BE52">Portada</Badge>}
                    {v.gender && <Badge color="#00A7AB">{v.gender === "hombre" ? "Hombre" : "Mujer"}</Badge>}
                  </div>
                  <p className="text-xs text-ui-gray mb-3">
                    {v.stock_infinite ? "Stock infinito" : `${v.stock} unidades`}
                  </p>
                  <ImageUpload
                    productId={id}
                    variantId={v.id}
                    existingUrls={v.images ?? []}
                    onUpdate={(urls) => updateVariantImages(v.id, urls)}
                  />
                  <ViewsUpload
                    productId={id}
                    variantId={v.id}
                    existingViews={v.views}
                    onUpdate={(views) => updateVariantViews(v.id, views)}
                  />
                  {editingId === v.id && (
                    <div className="mt-3 pt-3 border-t border-ui-border space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <FieldLabel required>Nombre del color</FieldLabel>
                          <AdminInput value={editForm.color_name} onChange={(e) => setEditForm((p) => ({ ...p, color_name: e.target.value }))} />
                        </div>
                        <div>
                          <FieldLabel>Color</FieldLabel>
                          <div className="flex items-center gap-2">
                            <input type="color" value={editForm.color_hex} onChange={(e) => setEditForm((p) => ({ ...p, color_hex: e.target.value }))} className="w-10 h-10 rounded-lg border border-ui-border cursor-pointer" />
                            <AdminInput value={editForm.color_hex} onChange={(e) => setEditForm((p) => ({ ...p, color_hex: e.target.value }))} className="font-mono text-sm" maxLength={7} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Género</FieldLabel>
                        <AdminSelect value={editForm.gender} onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))} className="w-48">
                          <option value="">Unisex (aplica a todos)</option>
                          <option value="hombre">Hombre</option>
                          <option value="mujer">Mujer</option>
                        </AdminSelect>
                      </div>
                      {editForm.gender && (
                        <div>
                          <FieldLabel>Tallas propias de este color (vacío = usa las del producto)</FieldLabel>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {SIZES.map((size) => (
                              <label key={size} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editForm.sizes_available.includes(size)}
                                  onChange={(e) =>
                                    setEditForm((p) => ({
                                      ...p,
                                      sizes_available: e.target.checked
                                        ? [...p.sizes_available, size]
                                        : p.sizes_available.filter((s) => s !== size),
                                    }))
                                  }
                                  className="accent-primary w-4 h-4"
                                />
                                <span className="text-sm">{size}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      <AdminToggle checked={editForm.stock_infinite} onChange={(val) => setEditForm((p) => ({ ...p, stock_infinite: val }))} label="Stock infinito" />
                      {!editForm.stock_infinite && (
                        <div className="w-32">
                          <FieldLabel>Cantidad</FieldLabel>
                          <AdminInput type="number" min="0" value={editForm.stock} onChange={(e) => setEditForm((p) => ({ ...p, stock: parseInt(e.target.value) || 0 }))} />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Btn onClick={saveVariantEdit} disabled={savingEdit}>{savingEdit ? "Guardando..." : "Guardar cambios"}</Btn>
                        <Btn variant="secondary" onClick={() => setEditingId(null)}>Cancelar</Btn>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {variantIdx !== 0 && (
                    <Btn variant="secondary" size="sm" onClick={() => makeVariantCover(v.id)}>Usar como portada</Btn>
                  )}
                  <Btn variant="secondary" size="sm" onClick={() => startEditVariant(v)}>Editar</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => toggleVariantActive(v.id, v.active)}>
                    {v.active ? "Desactivar" : "Activar"}
                  </Btn>
                  <Btn variant="danger" size="sm" onClick={() => deleteVariant(v.id)}>Eliminar</Btn>
                </div>
              </div>
            </AdminCard>
          ))}

          {/* Add variant form */}
          <AdminCard className="p-4">
            <p className="text-sm font-semibold text-foreground mb-4">+ Agregar color</p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <FieldLabel required>Nombre del color</FieldLabel>
                <AdminInput
                  value={newVariant.color_name}
                  onChange={(e) => setNewVariant((p) => ({ ...p, color_name: e.target.value }))}
                  placeholder="Azul marino"
                />
              </div>
              <div>
                <FieldLabel>Color</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newVariant.color_hex}
                    onChange={(e) => setNewVariant((p) => ({ ...p, color_hex: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-ui-border cursor-pointer"
                  />
                  <AdminInput
                    value={newVariant.color_hex}
                    onChange={(e) => setNewVariant((p) => ({ ...p, color_hex: e.target.value }))}
                    className="font-mono text-sm uppercase"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <FieldLabel>Género</FieldLabel>
              <AdminSelect
                value={newVariant.gender}
                onChange={(e) => setNewVariant((p) => ({ ...p, gender: e.target.value, sizes_available: [] }))}
                className="w-48"
              >
                <option value="">Unisex (aplica a todos)</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
              </AdminSelect>
            </div>
            {newVariant.gender && (
              <div className="mb-4">
                <FieldLabel>Tallas propias de este color (vacío = usa las del producto)</FieldLabel>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SIZES.map((size) => (
                    <label key={size} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newVariant.sizes_available.includes(size)}
                        onChange={(e) =>
                          setNewVariant((p) => ({
                            ...p,
                            sizes_available: e.target.checked
                              ? [...p.sizes_available, size]
                              : p.sizes_available.filter((s) => s !== size),
                          }))
                        }
                        className="accent-primary w-4 h-4"
                      />
                      <span className="text-sm">{size}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="mb-4">
              <AdminToggle
                checked={newVariant.stock_infinite}
                onChange={(v) => setNewVariant((p) => ({ ...p, stock_infinite: v }))}
                label="Stock infinito"
              />
              {!newVariant.stock_infinite && (
                <div className="mt-2 w-32">
                  <FieldLabel>Cantidad</FieldLabel>
                  <AdminInput
                    type="number" min="0"
                    value={newVariant.stock}
                    onChange={(e) => setNewVariant((p) => ({ ...p, stock: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <Btn onClick={addVariant} disabled={addingVariant}>
              {addingVariant ? "Agregando..." : "Agregar variante"}
            </Btn>
          </AdminCard>
        </div>
      )}

      {tab === "técnicas" && (
        <AdminCard className="p-6 sm:p-7">
          <p className="text-lg font-bold text-foreground mb-1.5">Técnicas de impresión</p>
          <p className="text-sm text-ui-gray mb-6 max-w-xl">
            Selecciona las técnicas de impresión disponibles para este producto. Solo las técnicas
            seleccionadas aparecerán en el personalizador.
          </p>

          {techniques.length === 0 ? (
            <EmptyState message="No hay técnicas de impresión configuradas todavía." />
          ) : (
            <div className="flex flex-wrap gap-2.5 mb-6">
              {techniques.map((t) => {
                const selected = selectedTechniqueIds.includes(t.id);
                const noPrice = !t.price_table || t.price_table.length === 0;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTechnique(t.id)}
                    aria-pressed={selected}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all duration-150 ease-out ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-ui-border bg-white text-foreground hover:border-primary/50"
                    }`}
                  >
                    {selected && (
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                      </svg>
                    )}
                    <span>{t.name}</span>
                    {noPrice && (
                      <span className={`text-[10px] font-medium ${selected ? "text-white/75" : "text-ui-gray"}`}>
                        · Precio no configurado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {techniquesError && <p className="text-xs text-red-500 mb-3">Error al guardar: {techniquesError}</p>}
          <div className="pt-5 border-t border-ui-border flex items-center gap-3">
            <Btn onClick={saveTechniques} disabled={savingTechniques}>
              {savingTechniques ? "Guardando..." : "Guardar técnicas"}
            </Btn>
            {techniquesSaved && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-dark">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
                Guardado
              </span>
            )}
          </div>
        </AdminCard>
      )}
    </div>
  );
}
