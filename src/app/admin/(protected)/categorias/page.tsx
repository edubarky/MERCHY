"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, AdminCard, Table, Td, Btn, FieldLabel, AdminInput, EmptyState } from "@/components/admin/ui";

const ICONS = ["👕","🧥","🧢","☕","🎒","⚽","🖊️","🎁","💼","🏅","👜","🧴"];

export default function CategoriasPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", slug: "", icon: "🏷️", sort_order: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCategories(data ?? []);
  }

  useEffect(() => { load(); }, []);

  function toSlug(name: string) {
    return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editId) {
      await supabase.from("categories").update(form).eq("id", editId);
    } else {
      await supabase.from("categories").insert({ ...form, active: true });
    }
    setForm({ name: "", slug: "", icon: "🏷️", sort_order: 0 });
    setEditId(null);
    await load();
    setSaving(false);
  }

  function startEdit(cat: any) {
    setEditId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon ?? "🏷️", sort_order: cat.sort_order });
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("categories").update({ active: !active }).eq("id", id);
    await load();
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Categorías" subtitle="Organiza el catálogo por tipo de producto" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2">
          <AdminCard>
            {!categories.length ? (
              <EmptyState message="Sin categorías." />
            ) : (
              <Table headers={["", "Nombre", "Slug", "Orden", "Estado", ""]}>
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <Td><span className="text-xl">{c.icon}</span></Td>
                    <Td><span className="font-medium">{c.name}</span></Td>
                    <Td><span className="font-mono text-xs text-ui-gray">{c.slug}</span></Td>
                    <Td><span className="text-ui-gray">{c.sort_order}</span></Td>
                    <Td>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.active ? "Activa" : "Inactiva"}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        <Btn size="sm" variant="secondary" onClick={() => startEdit(c)}>Editar</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => toggleActive(c.id, c.active)}>{c.active ? "Off" : "On"}</Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </AdminCard>
        </div>

        {/* Form */}
        <AdminCard className="p-4 h-fit">
          <p className="font-semibold text-sm text-foreground mb-4">{editId ? "Editar categoría" : "Nueva categoría"}</p>
          <div className="space-y-3">
            <div>
              <FieldLabel required>Nombre</FieldLabel>
              <AdminInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, slug: toSlug(e.target.value) }))} placeholder="Playeras" />
            </div>
            <div>
              <FieldLabel>Slug</FieldLabel>
              <AdminInput value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} className="font-mono text-sm" />
            </div>
            <div>
              <FieldLabel>Ícono</FieldLabel>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ICONS.map((ic) => (
                  <button key={ic} onClick={() => setForm((p) => ({ ...p, icon: ic }))}
                    className={`text-xl p-1 rounded-lg border transition-colors ${form.icon === ic ? "border-primary bg-teal-light" : "border-transparent hover:border-ui-border"}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Orden</FieldLabel>
              <AdminInput type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="w-20" />
            </div>
            <div className="flex gap-2 pt-2">
              <Btn onClick={save} disabled={saving} className="flex-1">{saving ? "..." : editId ? "Guardar" : "Agregar"}</Btn>
              {editId && <Btn variant="secondary" onClick={() => { setEditId(null); setForm({ name: "", slug: "", icon: "🏷️", sort_order: 0 }); }}>Cancelar</Btn>}
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
