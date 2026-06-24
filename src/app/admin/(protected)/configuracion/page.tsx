"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, AdminCard, Table, Td, Btn, FieldLabel, AdminInput } from "@/components/admin/ui";

const PRESET_COLORS = ["#6366F1","#8B5CF6","#F59E0B","#EF4444","#3B82F6","#06B6D4","#22C55E","#EC4899","#F97316","#10B981"];

export default function ConfiguracionPage() {
  const supabase = createClient();
  const [statuses, setStatuses] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", color: "#6B7280" });
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("production_statuses").select("*").order("sort_order");
    setStatuses(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const maxOrder = Math.max(0, ...statuses.map((s) => s.sort_order));
    if (editId) {
      await supabase.from("production_statuses").update({ name: form.name, color: form.color }).eq("id", editId);
    } else {
      await supabase.from("production_statuses").insert({ name: form.name, color: form.color, sort_order: maxOrder + 1, active: true });
    }
    setForm({ name: "", color: "#6B7280" }); setEditId(null);
    await load(); setSaving(false);
  }

  async function moveStatus(id: string, direction: "up" | "down") {
    const idx = statuses.findIndex((s) => s.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= statuses.length) return;
    const a = statuses[idx], b = statuses[swapIdx];
    await Promise.all([
      supabase.from("production_statuses").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("production_statuses").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    await load();
  }

  async function toggleStatus(id: string, active: boolean) {
    await supabase.from("production_statuses").update({ active: !active }).eq("id", id);
    await load();
  }

  async function deleteStatus(id: string) {
    await supabase.from("production_statuses").delete().eq("id", id);
    await load();
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Configuración" subtitle="Ajustes del sistema de producción" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdminCard>
            <div className="px-5 py-4 border-b border-ui-border">
              <h2 className="font-semibold text-sm">Estados de producción</h2>
              <p className="text-xs text-ui-gray mt-0.5">Los proyectos avanzan a través de estos estados</p>
            </div>
            <Table headers={["", "Nombre", "Color", "Estado", "Orden", ""]}>
              {statuses.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <Td>
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                  </Td>
                  <Td><span className="font-medium text-sm">{s.name}</span></Td>
                  <Td><span className="font-mono text-xs text-ui-gray">{s.color}</span></Td>
                  <Td>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.active ? "Activo" : "Inactivo"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <Btn size="sm" variant="ghost" onClick={() => moveStatus(s.id, "up")} disabled={i === 0}>↑</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => moveStatus(s.id, "down")} disabled={i === statuses.length - 1}>↓</Btn>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <Btn size="sm" variant="secondary" onClick={() => { setEditId(s.id); setForm({ name: s.name, color: s.color }); }}>Editar</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => toggleStatus(s.id, s.active)}>{s.active ? "Off" : "On"}</Btn>
                      <Btn size="sm" variant="danger" onClick={() => deleteStatus(s.id)}>×</Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          </AdminCard>
        </div>

        <AdminCard className="p-4 h-fit">
          <p className="font-semibold text-sm mb-4">{editId ? "Editar estado" : "Nuevo estado"}</p>
          <div className="space-y-3">
            <div>
              <FieldLabel required>Nombre</FieldLabel>
              <AdminInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="En revisión..." />
            </div>
            <div>
              <FieldLabel>Color</FieldLabel>
              <div className="flex items-center gap-2 mb-2">
                <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-ui-border cursor-pointer" />
                <AdminInput value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="font-mono text-sm uppercase w-28" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => setForm((p) => ({ ...p, color: c }))}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Btn onClick={save} disabled={saving} className="flex-1">{saving ? "..." : editId ? "Guardar" : "Agregar"}</Btn>
              {editId && <Btn variant="secondary" onClick={() => { setEditId(null); setForm({ name: "", color: "#6B7280" }); }}>Cancelar</Btn>}
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
