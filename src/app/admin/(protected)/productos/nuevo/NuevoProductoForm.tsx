"use client";

import { useState, FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AdminCard, FieldLabel, AdminInput, AdminTextarea, AdminSelect, Btn
} from "@/components/admin/ui";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Único"];
const EMPTY_SUPPLIER = { name: "", contact_name: "", phone: "", email: "", website: "", notes: "" };

interface Category { id: string; name: string; }
interface Supplier { id: string; name: string; }

export default function NuevoProductoForm({
  categories,
  initialSuppliers,
}: {
  categories: Category[];
  initialSuppliers: Supplier[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [supplierId, setSupplierId] = useState("");
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [supForm, setSupForm] = useState(EMPTY_SUPPLIER);
  const [savingSupplier, setSavingSupplier] = useState(false);

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
    setSupForm(EMPTY_SUPPLIER);
    setShowModal(false);
    setSavingSupplier(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const sizes = fd.getAll("sizes") as string[];

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: fd.get("name") as string,
        description: (fd.get("description") as string) || null,
        composition: (fd.get("composition") as string) || null,
        category_id: (fd.get("category_id") as string) || null,
        supplier_id: supplierId || null,
        sizes_available: sizes,
        costo: parseFloat(fd.get("costo") as string),
        active: true,
      })
      .select("id")
      .single();

    setSaving(false);
    if (!error && data) router.push(`/admin/productos/${data.id}`);
  }

  return (
    <>
      <AdminCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <FieldLabel required>Nombre</FieldLabel>
            <AdminInput name="name" required placeholder="Playera manga corta" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Categoría</FieldLabel>
              <AdminSelect name="category_id" required>
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
                  onClick={() => setShowModal(true)}
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
            <AdminTextarea name="description" placeholder="Descripción del producto para el catálogo..." />
          </div>

          <div>
            <FieldLabel>Composición</FieldLabel>
            <AdminInput name="composition" placeholder="100% algodón, 180 g/m²" />
          </div>

          <div>
            <FieldLabel>Tallas disponibles</FieldLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              {SIZES.map((size) => (
                <label key={size} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" name="sizes" value={size} className="accent-primary w-4 h-4" />
                  <span className="text-sm">{size}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-ui-gray mt-1">Deja vacío si el producto no tiene tallas</p>
          </div>

          <div className="w-40">
            <FieldLabel required>Costo (MXN)</FieldLabel>
            <AdminInput name="costo" type="number" step="0.01" min="0" required placeholder="0.00" />
          </div>

          <div className="pt-2 border-t border-ui-border flex justify-end">
            <Btn type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar y agregar colores →"}
            </Btn>
          </div>
        </form>
      </AdminCard>

      {/* Modal nuevo proveedor */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-base">Nuevo proveedor</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-ui-gray hover:text-foreground text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <FieldLabel required>Nombre</FieldLabel>
                <AdminInput
                  value={supForm.name}
                  onChange={(e) => setSupForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nombre de la empresa o persona"
                />
              </div>
              <div>
                <FieldLabel>Contacto</FieldLabel>
                <AdminInput
                  value={supForm.contact_name}
                  onChange={(e) => setSupForm((p) => ({ ...p, contact_name: e.target.value }))}
                  placeholder="Nombre del contacto"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Teléfono</FieldLabel>
                  <AdminInput
                    value={supForm.phone}
                    onChange={(e) => setSupForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="55 1234 5678"
                  />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <AdminInput
                    type="email"
                    value={supForm.email}
                    onChange={(e) => setSupForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="proveedor@email.com"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Sitio web</FieldLabel>
                <AdminInput
                  value={supForm.website}
                  onChange={(e) => setSupForm((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <FieldLabel>Notas</FieldLabel>
                <AdminTextarea
                  value={supForm.notes}
                  onChange={(e) => setSupForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Condiciones, tiempos de entrega, etc."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <Btn onClick={saveSupplier} disabled={savingSupplier || !supForm.name.trim()} className="flex-1">
                {savingSupplier ? "Guardando..." : "Agregar proveedor"}
              </Btn>
              <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
