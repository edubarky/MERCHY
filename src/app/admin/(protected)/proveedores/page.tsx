"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PageHeader, AdminCard, Table, Td, Btn,
  FieldLabel, AdminInput, AdminTextarea, EmptyState,
} from "@/components/admin/ui";

const EMPTY = { name: "", contact_name: "", phone: "", email: "", website: "", notes: "" };

export default function ProveedoresPage() {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data ?? []);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditId(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function startEdit(s: any) {
    setEditId(s.id);
    setForm({
      name: s.name,
      contact_name: s.contact_name ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      website: s.website ?? "",
      notes: s.notes ?? "",
    });
    setShowModal(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, active: true };
    if (editId) {
      await supabase.from("suppliers").update(payload).eq("id", editId);
    } else {
      await supabase.from("suppliers").insert(payload);
    }
    setShowModal(false);
    setForm(EMPTY);
    setEditId(null);
    await load();
    setSaving(false);
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("suppliers").update({ active: !active }).eq("id", id);
    await load();
  }

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title="Proveedores"
        subtitle="Empresas y personas que surten los productos"
        action={<Btn onClick={openNew}>+ Nuevo proveedor</Btn>}
      />

      <AdminCard>
        {!suppliers.length ? (
          <EmptyState message="Sin proveedores registrados." />
        ) : (
          <Table headers={["Nombre", "Contacto", "Teléfono", "Email", "Estado", ""]}>
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <Td><span className="font-medium">{s.name}</span></Td>
                <Td><span className="text-ui-gray">{s.contact_name ?? "—"}</span></Td>
                <Td><span className="text-ui-gray">{s.phone ?? "—"}</span></Td>
                <Td><span className="text-ui-gray">{s.email ?? "—"}</span></Td>
                <Td>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.active ? "Activo" : "Inactivo"}
                  </span>
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <Btn size="sm" variant="secondary" onClick={() => startEdit(s)}>Editar</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => toggleActive(s.id, s.active)}>
                      {s.active ? "Off" : "On"}
                    </Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </AdminCard>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-base">
                {editId ? "Editar proveedor" : "Nuevo proveedor"}
              </h3>
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
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nombre de la empresa o persona"
                />
              </div>
              <div>
                <FieldLabel>Contacto</FieldLabel>
                <AdminInput
                  value={form.contact_name}
                  onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                  placeholder="Nombre del contacto"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Teléfono</FieldLabel>
                  <AdminInput
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="55 1234 5678"
                  />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <AdminInput
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="proveedor@email.com"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Sitio web</FieldLabel>
                <AdminInput
                  value={form.website}
                  onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <FieldLabel>Notas</FieldLabel>
                <AdminTextarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Condiciones, tiempos de entrega, etc."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <Btn onClick={save} disabled={saving || !form.name.trim()} className="flex-1">
                {saving ? "Guardando..." : editId ? "Guardar cambios" : "Agregar proveedor"}
              </Btn>
              <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
