"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PageHeader, AdminCard, FieldLabel, AdminInput, AdminTextarea,
  AdminSelect, AdminToggle, Btn, Badge,
} from "@/components/admin/ui";
import ImageUpload from "@/components/admin/ImageUpload";
import Link from "next/link";

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
  const [tab, setTab] = useState<"detalles" | "variantes">("detalles");
  const [newVariant, setNewVariant] = useState({ color_name: "", color_hex: "#000000", stock_infinite: true, stock: 0 });
  const [addingVariant, setAddingVariant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: cats }, { data: sups }, { data: vars }] = await Promise.all([
        supabase.from("products").select("*, category:categories(id,name), supplier:suppliers(id,name)").eq("id", id).single(),
        supabase.from("categories").select("id, name").eq("active", true).order("sort_order"),
        supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
        supabase.from("product_variants").select("*").eq("product_id", id).order("created_at"),
      ]);
      setProduct(p);
      setCategories(cats ?? []);
      setSuppliers(sups ?? []);
      setVariants(vars ?? []);
    }
    load();
  }, [id]);

  async function saveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const sizes = fd.getAll("sizes") as string[];
    await supabase.from("products").update({
      name: fd.get("name"),
      description: fd.get("description") || null,
      composition: fd.get("composition") || null,
      category_id: fd.get("category_id") || null,
      supplier_id: fd.get("supplier_id") || null,
      sizes_available: sizes,
      costo: parseFloat(fd.get("costo") as string),
    }).eq("id", id);
    setSaving(false);
  }

  async function addVariant() {
    if (!newVariant.color_name.trim()) { setError("El nombre del color es obligatorio."); return; }
    setError(null);
    setAddingVariant(true);
    const { data, error: err } = await supabase
      .from("product_variants")
      .insert({ product_id: id, ...newVariant, images: [] })
      .select("*")
      .single();
    if (err) { setError("Error al agregar variante."); setAddingVariant(false); return; }
    setVariants((prev) => [...prev, data]);
    setNewVariant({ color_name: "", color_hex: "#000000", stock_infinite: true, stock: 0 });
    setAddingVariant(false);
  }

  async function deleteVariant(variantId: string) {
    await supabase.from("product_variants").delete().eq("id", variantId);
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
  }

  async function updateVariantImages(variantId: string, urls: string[]) {
    setVariants((prev) => prev.map((v) => v.id === variantId ? { ...v, images: urls } : v));
  }

  async function toggleVariantActive(variantId: string, active: boolean) {
    await supabase.from("product_variants").update({ active: !active }).eq("id", variantId);
    setVariants((prev) => prev.map((v) => v.id === variantId ? { ...v, active: !active } : v));
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
        {(["detalles", "variantes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? "border-b-2 border-primary text-primary" : "text-ui-gray hover:text-foreground"}`}
          >
            {t} {t === "variantes" && `(${variants.length})`}
          </button>
        ))}
      </div>

      {tab === "detalles" && (
        <AdminCard className="p-6">
          <form onSubmit={saveProduct} className="space-y-5">
            <div>
              <FieldLabel required>Nombre</FieldLabel>
              <AdminInput name="name" defaultValue={product.name} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Categoría</FieldLabel>
                <AdminSelect name="category_id" defaultValue={product.category_id ?? ""} required>
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </AdminSelect>
              </div>
              <div>
                <FieldLabel>Proveedor</FieldLabel>
                <AdminSelect name="supplier_id" defaultValue={product.supplier_id ?? ""}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </AdminSelect>
              </div>
            </div>
            <div>
              <FieldLabel>Descripción</FieldLabel>
              <AdminTextarea name="description" defaultValue={product.description ?? ""} />
            </div>
            <div>
              <FieldLabel>Composición</FieldLabel>
              <AdminInput name="composition" defaultValue={product.composition ?? ""} />
            </div>
            <div>
              <FieldLabel>Tallas disponibles</FieldLabel>
              <div className="flex flex-wrap gap-2 mt-1">
                {SIZES.map((size) => (
                  <label key={size} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" name="sizes" value={size} defaultChecked={product.sizes_available?.includes(size)} className="accent-primary w-4 h-4" />
                    <span className="text-sm">{size}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="w-40">
              <FieldLabel required>Costo (MXN)</FieldLabel>
              <AdminInput name="costo" type="number" step="0.01" min="0" defaultValue={product.costo} required />
            </div>
            <div className="pt-2 border-t border-ui-border flex justify-end">
              <Btn type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Btn>
            </div>
          </form>
        </AdminCard>
      )}

      {tab === "variantes" && (
        <div className="space-y-4">
          {/* Existing variants */}
          {variants.map((v) => (
            <AdminCard key={v.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-white shadow flex-shrink-0 mt-0.5" style={{ backgroundColor: v.color_hex }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{v.color_name}</span>
                    <span className="font-mono text-xs text-ui-gray bg-gray-100 px-2 py-0.5 rounded">{v.sku}</span>
                    {!v.active && <Badge color="#9CA3AF">Inactivo</Badge>}
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
                </div>
                <div className="flex flex-col gap-1">
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
    </div>
  );
}
