"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, AdminCard, Table, Td, Btn, FieldLabel, AdminInput, AdminTextarea, EmptyState } from "@/components/admin/ui";

const EMPTY = { name: "", contact_name: "", phone: "", email: "", company: "", rfc: "", notes: "" };

export default function ClientesPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    const { data } = await supabase.from("clients").select("*").order("name");
    setClients(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editId) {
      await supabase.from("clients").update({ ...form }).eq("id", editId);
    } else {
      await supabase.from("clients").insert({ ...form, active: true });
    }
    setForm(EMPTY); setEditId(null); setShowForm(false);
    await load(); setSaving(false);
  }

  function startEdit(c: any) {
    setEditId(c.id);
    setForm({ name: c.name, contact_name: c.contact_name ?? "", phone: c.phone ?? "", email: c.email ?? "", company: c.company ?? "", rfc: c.rfc ?? "", notes: c.notes ?? "" });
    setShowForm(true);
  }

  const filtered = clients.filter((c) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.company ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} clientes registrados`}
        action={<Btn onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }}>+ Nuevo cliente</Btn>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={showForm ? "lg:col-span-2" : "lg:col-span-3"}>
          <AdminCard>
            <div className="p-4 border-b border-ui-border">
              <AdminInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente..." className="max-w-xs" />
            </div>
            {!filtered.length ? (
              <EmptyState message={q ? "Sin resultados." : "Sin clientes registrados."} />
            ) : (
              <Table headers={["Nombre", "Empresa", "Contacto", "Teléfono", "RFC", ""]}>
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <Td><span className="font-medium">{c.name}</span></Td>
                    <Td><span className="text-ui-gray">{c.company ?? "—"}</span></Td>
                    <Td><span className="text-ui-gray">{c.contact_name ?? "—"}</span></Td>
                    <Td><span className="text-ui-gray">{c.phone ?? "—"}</span></Td>
                    <Td><span className="font-mono text-xs text-ui-gray">{c.rfc ?? "—"}</span></Td>
                    <Td><Btn size="sm" variant="secondary" onClick={() => startEdit(c)}>Editar</Btn></Td>
                  </tr>
                ))}
              </Table>
            )}
          </AdminCard>
        </div>

        {showForm && (
          <AdminCard className="p-4 h-fit">
            <p className="font-semibold text-sm mb-4">{editId ? "Editar cliente" : "Nuevo cliente"}</p>
            <div className="space-y-3">
              <div><FieldLabel required>Nombre</FieldLabel><AdminInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><FieldLabel>Empresa</FieldLabel><AdminInput value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} /></div>
              <div><FieldLabel>Contacto</FieldLabel><AdminInput value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} /></div>
              <div><FieldLabel>Teléfono</FieldLabel><AdminInput value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div><FieldLabel>Email</FieldLabel><AdminInput type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
              <div><FieldLabel>RFC</FieldLabel><AdminInput value={form.rfc} onChange={(e) => setForm((p) => ({ ...p, rfc: e.target.value }))} className="uppercase font-mono" /></div>
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
