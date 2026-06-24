"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, AdminCard, Table, Td, Btn, FieldLabel, AdminInput, AdminTextarea, EmptyState } from "@/components/admin/ui";

const EMPTY = { name: "", contact_name: "", phone: "", email: "", website: "", notes: "" };

export default function ProveedoresPage() {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, active: true };
    if (editId) {
      await supabase.from("suppliers").update(payload).eq("id", editId);
    } else {
      await supabase.from("suppliers").insert(payload);
    }
    setForm(EMPTY); setEditId(null); setShowForm(false);
    await load(); setSaving(false);
  }

  function startEdit(s: any) {
    setEditId(s.id);
    setForm({ name: s.name, contact_name: s.contact_name ?? "", phone: s.phone ?? "", email: s.email ?? "", website: s.website ?? "", notes: s.notes ?? "" });
    setShowForm(true);
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
        action={<Btn onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }}>+ Nuevo proveedor</Btn>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={showForm ? "lg:col-span-2" : "lg:col-span-3"}>
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
                        <Btn size="sm" variant="ghost" onClick={() => toggleActive(s.id, s.active)}>{s.active ? "Off" : "On"}</Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </AdminCard>
        </div>

        {showForm && (
          <AdminCard className="p-4 h-fit">
            <p className="font-semibold text-sm mb-4">{editId ? "Editar proveedor" : "Nuevo proveedor"}</p>
            <div className="space-y-3">
              <div><FieldLabel required>Nombre</FieldLabel><AdminInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><FieldLabel>Contacto</FieldLabel><AdminInput value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} /></div>
              <div><FieldLabel>Teléfono</FieldLabel><AdminInput value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div><FieldLabel>Email</FieldLabel><AdminInput type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
              <div><FieldLabel>Sitio web</FieldLabel><AdminInput value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://..." /></div>
              <div><FieldLabel>Notas</FieldLabel><AdminTextarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
              <div className="flex gap-2 pt-2">
                <Btn onClick={save} disabled={saving} className="flex-1">{saving ? "..." : editId ? "Guardar" : "Agregar"}</Btn>
                <Btn variant="secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</Btn>
              </div>
            </div>
          </AdminCard>
        )}
      </div>
    </div>
  );
}
