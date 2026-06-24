"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, AdminCard, AdminSelect, AdminTextarea, AdminInput, FieldLabel, Btn, Badge } from "@/components/admin/ui";
import Link from "next/link";

export default function ProyectoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [project, setProject] = useState<any>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  async function load() {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("projects")
        .select("*, client:clients(name, phone, email, company), agent:profiles(full_name), status:production_statuses(id, name, color)")
        .eq("id", id).single(),
      supabase.from("production_statuses").select("id, name, color").eq("active", true).order("sort_order"),
    ]);
    setProject(p);
    setStatuses(s ?? []);
    setForm({
      status_id: p?.status_id ?? "",
      notes: p?.notes ?? "",
      total_amount: p?.total_amount ?? 0,
      approved_at: p?.approved_at ? p.approved_at.slice(0, 10) : "",
      scheduled_delivery_at: p?.scheduled_delivery_at ? p.scheduled_delivery_at.slice(0, 10) : "",
      delivered_at: p?.delivered_at ? p.delivered_at.slice(0, 10) : "",
    });
  }

  useEffect(() => { load(); }, [id]);

  async function save() {
    setSaving(true);
    await supabase.from("projects").update({
      status_id: form.status_id || null,
      notes: form.notes || null,
      total_amount: parseFloat(form.total_amount) || 0,
      approved_at: form.approved_at || null,
      scheduled_delivery_at: form.scheduled_delivery_at || null,
      delivered_at: form.delivered_at || null,
    }).eq("id", id);
    await load();
    setSaving(false);
  }

  function fmt(date: string | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  }

  if (!project || !form) return <div className="p-6 text-ui-gray">Cargando...</div>;

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title={project.project_number}
        subtitle={project.client?.name ?? "Sin cliente"}
        action={<Link href="/admin/proyectos"><Btn variant="secondary">← Proyectos</Btn></Link>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit form */}
        <div className="lg:col-span-2 space-y-4">
          <AdminCard className="p-5">
            <p className="font-semibold text-sm mb-4">Actualizar proyecto</p>
            <div className="space-y-4">
              <div>
                <FieldLabel>Status</FieldLabel>
                <AdminSelect value={form.status_id} onChange={(e) => setForm((p: any) => ({ ...p, status_id: e.target.value }))}>
                  <option value="">Sin status</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </AdminSelect>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <FieldLabel>Fecha aprobación</FieldLabel>
                  <AdminInput type="date" value={form.approved_at} onChange={(e) => setForm((p: any) => ({ ...p, approved_at: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Entrega programada</FieldLabel>
                  <AdminInput type="date" value={form.scheduled_delivery_at} onChange={(e) => setForm((p: any) => ({ ...p, scheduled_delivery_at: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Entrega real</FieldLabel>
                  <AdminInput type="date" value={form.delivered_at} onChange={(e) => setForm((p: any) => ({ ...p, delivered_at: e.target.value }))} />
                </div>
              </div>
              <div>
                <FieldLabel>Monto total (MXN)</FieldLabel>
                <AdminInput type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm((p: any) => ({ ...p, total_amount: e.target.value }))} className="w-40" />
              </div>
              <div>
                <FieldLabel>Notas internas</FieldLabel>
                <AdminTextarea value={form.notes} onChange={(e) => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={4} placeholder="Observaciones del proyecto..." />
              </div>
              <div className="flex justify-end">
                <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Btn>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          <AdminCard className="p-4">
            <p className="text-xs font-semibold text-ui-gray uppercase tracking-wider mb-3">Resumen</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ui-gray">Status</span>
                {project.status ? <Badge color={project.status.color}>{project.status.name}</Badge> : <span className="text-ui-gray">—</span>}
              </div>
              <div className="flex justify-between">
                <span className="text-ui-gray">Monto</span>
                <span className="font-bold">${Number(project.total_amount).toLocaleString("es-MX")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ui-gray">Agente</span>
                <span>{project.agent?.full_name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ui-gray">Aprobación</span>
                <span>{fmt(project.approved_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ui-gray">Entrega prog.</span>
                <span>{fmt(project.scheduled_delivery_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ui-gray">Entrega real</span>
                <span>{fmt(project.delivered_at)}</span>
              </div>
            </div>
          </AdminCard>

          {project.client && (
            <AdminCard className="p-4">
              <p className="text-xs font-semibold text-ui-gray uppercase tracking-wider mb-3">Cliente</p>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{project.client.name}</p>
                {project.client.company && <p className="text-ui-gray">{project.client.company}</p>}
                {project.client.phone && <p className="text-ui-gray">{project.client.phone}</p>}
                {project.client.email && <p className="text-ui-gray">{project.client.email}</p>}
              </div>
            </AdminCard>
          )}
        </div>
      </div>
    </div>
  );
}
