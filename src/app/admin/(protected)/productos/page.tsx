"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  PageHeader, AdminCard, Table, Td, Btn,
  FieldLabel, AdminInput, AdminTextarea, AdminSelect, EmptyState,
} from "@/components/admin/ui";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Único"];
const EMPTY_P = { name: "", description: "", composition: "", category_id: "", costo: "" };
const EMPTY_S = { name: "", contact_name: "", phone: "", email: "", website: "", notes: "" };

export default function ProductosPage() {
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // Product modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_P);
  const [sizes, setSizes] = useState<string[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [saving, setSaving] = useState(false);

  // Supplier sub-modal
  const [showSupModal, setShowSupModal] = useState(false);
  const [supForm, setSupForm] = useState(EMPTY_S);
  const [savingSupplier, setSavingSupplier] = useState(false);

  const loadProducts = useCallback(async (search = "") => {
    let query = supabase
      .from("products")
      .select("id, sku, name, active, costo, category:categories(name), supplier:suppliers(name), variants:product_variants(id)")
      .order("created_at", { ascending: false });
    if (search) query = query.ilike("name", `%${search}%`);
    const { data } = await query;
    setProducts(data ?? []);
    setLoading(false);
  }, []);

  async function loadCatalogs() {
    const [{ data: cats }, { data: sups }] = await Promise.all([
      supabase.from("categories").select("id, name").eq("active", true).order("sort_order"),
      supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
    ]);
    setCategories(cats ?? []);
    setSuppliers(sups ?? []);
  }

  useEffect(() => { loadProducts(); loadCatalogs(); }, []);

  function openNew() {
    setForm(EMPTY_P);
    setSizes([]);
    setSupplierId("");
    setShowModal(true);
  }

  async function saveProduct() {
    if (!form.name.trim() || !form.category_id || !form.costo) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description || null,
      composition: form.composition || null,
      category_id: form.category_id,
      sizes_available: sizes,
      costo: parseFloat(form.costo),
      active: true,
    };
    if (supplierId) payload.supplier_id = supplierId;

    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    setSaving(false);
    if (error) { alert("Error: " + error.message); return; }
    if (data) {
      setShowModal(false);
      router.push(`/admin/productos/${data.id}`);
    }
  }

  async function saveSupplier() {
    if (!supForm.name.trim()) return;
    setSavingSupplier(true);
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ ...supForm, active: true })
      .select("id, name")
      .single();
    if (!error && data) {
      setSuppliers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierId(data.id);
    }
    setSupForm(EMPTY_S);
    setShowSupModal(false);
    setSavingSupplier(false);
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("products").update({ active: !active }).eq("id", id);
    await loadProducts(q);
  }

  function toggleSize(size: string) {
    setSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]);
  }

  const filtered = q
    ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    : products;

  return (
    <div className="p-6 max-w-6xl">
      <PageHeader
        title="Productos"
        subtitle={`${filtered.length} productos`}
        action={<Btn onClick={openNew}>+ Nuevo producto</Btn>}
      />

      <AdminCard>
        <div className="p-4 border-b border-ui-border">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full max-w-xs px-3 py-2 border border-ui-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-ui-gray text-sm">Cargando...</div>
        ) : !filtered.length ? (
          <EmptyState message="Sin productos. Crea el primero." />
        ) : (
          <Table headers={["SKU", "Nombre", "Categoría", "Proveedor", "Variantes", "Costo", "Estado", ""]}>
            {filtered.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <Td><span className="font-mono text-xs text-ui-gray">{p.sku}</span></Td>
                <Td><span className="font-medium text-foreground">{p.name}</span></Td>
                <Td><span className="text-ui-gray">{p.category?.name ?? "—"}</span></Td>
                <Td><span className="text-ui-gray">{p.supplier?.name ?? "—"}</span></Td>
                <Td><span className="text-ui-gray">{p.variants?.length ?? 0} colores</span></Td>
                <Td><span className="font-medium">${Number(p.costo).toLocaleString("es-MX")}</span></Td>
                <Td>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.active ? "Activo" : "Inactivo"}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/productos/${p.id}`}>
                      <Btn variant="secondary" size="sm">Editar</Btn>
                    </Link>
                    <Btn variant="ghost" size="sm" onClick={() => toggleActive(p.id, p.active)}>
                      {p.active ? "Desactivar" : "Activar"}
                    </Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </AdminCard>

      {/* Modal nuevo producto */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-ui-border">
              <h3 className="font-display font-bold text-base">Nuevo producto</h3>
              <button onClick={() => setShowModal(false)} className="text-ui-gray hover:text-foreground text-xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <FieldLabel required>Nombre</FieldLabel>
                <AdminInput
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Playera manga corta"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel required>Categoría</FieldLabel>
                  <AdminSelect
                    value={form.category_id}
                    onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
                  >
                    <option value="">Seleccionar...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </AdminSelect>
                </div>
                <div>
                  <FieldLabel>Proveedor</FieldLabel>
                  <div className="flex gap-2 items-center">
                    <AdminSelect
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="flex-1"
                    >
                      <option value="">Sin proveedor</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </AdminSelect>
                    <button
                      type="button"
                      onClick={() => setShowSupModal(true)}
                      title="Nuevo proveedor"
                      className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-ui-border text-ui-gray hover:border-primary hover:text-primary transition-colors text-lg font-light"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel>Descripción</FieldLabel>
                <AdminTextarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción del producto para el catálogo..."
                />
              </div>

              <div>
                <FieldLabel>Composición</FieldLabel>
                <AdminInput
                  value={form.composition}
                  onChange={(e) => setForm((p) => ({ ...p, composition: e.target.value }))}
                  placeholder="100% algodón, 180 g/m²"
                />
              </div>

              <div>
                <FieldLabel>Tallas disponibles</FieldLabel>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SIZES.map((size) => (
                    <label key={size} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sizes.includes(size)}
                        onChange={() => toggleSize(size)}
                        className="accent-primary w-4 h-4"
                      />
                      <span className="text-sm">{size}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-ui-gray mt-1">Deja vacío si el producto no tiene tallas</p>
              </div>

              <div className="w-40">
                <FieldLabel required>Costo (MXN)</FieldLabel>
                <AdminInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costo}
                  onChange={(e) => setForm((p) => ({ ...p, costo: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-ui-border flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
              <Btn
                onClick={saveProduct}
                disabled={saving || !form.name.trim() || !form.category_id || !form.costo}
              >
                {saving ? "Guardando..." : "Guardar y agregar colores →"}
              </Btn>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sub-modal nuevo proveedor */}
      {showSupModal && createPortal(
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSupModal(false); }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-base">Nuevo proveedor</h3>
              <button onClick={() => setShowSupModal(false)} className="text-ui-gray hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <FieldLabel required>Nombre</FieldLabel>
                <AdminInput value={supForm.name} onChange={(e) => setSupForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre de la empresa" />
              </div>
              <div>
                <FieldLabel>Contacto</FieldLabel>
                <AdminInput value={supForm.contact_name} onChange={(e) => setSupForm((p) => ({ ...p, contact_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Teléfono</FieldLabel>
                  <AdminInput value={supForm.phone} onChange={(e) => setSupForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <AdminInput type="email" value={supForm.email} onChange={(e) => setSupForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <FieldLabel>Sitio web</FieldLabel>
                <AdminInput value={supForm.website} onChange={(e) => setSupForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <FieldLabel>Notas</FieldLabel>
                <AdminTextarea value={supForm.notes} onChange={(e) => setSupForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Btn onClick={saveSupplier} disabled={savingSupplier || !supForm.name.trim()} className="flex-1">
                {savingSupplier ? "..." : "Agregar proveedor"}
              </Btn>
              <Btn variant="secondary" onClick={() => setShowSupModal(false)}>Cancelar</Btn>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
