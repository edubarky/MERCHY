import { createClient } from "@/lib/supabase/server";
import { PageHeader, AdminCard, Table, Td, Badge, Btn, EmptyState } from "@/components/admin/ui";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function createProject(formData: FormData) {
  "use server";
  const { createClient: create } = await import("@/lib/supabase/server");
  const supabase = create();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("projects").insert({
    client_id: formData.get("client_id") || null,
    agent_id: user?.id,
    status_id: formData.get("status_id") || null,
    product_description: formData.get("product_description") || null,
    total_amount: parseFloat(formData.get("total_amount") as string) || 0,
    approved_at: formData.get("approved_at") || null,
    scheduled_delivery_at: formData.get("scheduled_delivery_at") || null,
  });
  revalidatePath("/admin/proyectos");
}

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  const [{ data: projects }, { data: statuses }, { data: clients }, { data: agents }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, project_number, total_amount, approved_at, scheduled_delivery_at, delivered_at, client:clients(name), agent:profiles(full_name), status:production_statuses(name, color)")
      .order("created_at", { ascending: false }),
    supabase.from("production_statuses").select("id, name, color").eq("active", true).order("sort_order"),
    supabase.from("clients").select("id, name").eq("active", true).order("name"),
    supabase.from("profiles").select("id, full_name").in("role", ["agent", "admin"]),
  ]);

  const filtered = (projects ?? []).filter((p: any) => {
    if (searchParams.status && p.status?.name !== searchParams.status) return false;
    if (searchParams.q) {
      const q = searchParams.q.toLowerCase();
      return (p.project_number ?? "").toLowerCase().includes(q) || (p.client?.name ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  function fmt(date: string | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  }

  return (
    <div className="p-6 max-w-7xl">
      <PageHeader
        title="Proyectos"
        subtitle={`${filtered.length} proyectos`}
        action={
          profile?.role === "admin" || true ? (
            <form action={createProject} className="flex gap-2 items-end flex-wrap">
              <div>
                <select name="client_id" className="px-3 py-2 border border-ui-border rounded-xl text-sm focus:outline-none focus:border-primary">
                  <option value="">Cliente...</option>
                  {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <input name="product_description" placeholder="Descripción (ej. Playeras)" className="px-3 py-2 border border-ui-border rounded-xl text-sm focus:outline-none focus:border-primary w-44" />
              <input name="total_amount" type="number" placeholder="Monto" className="px-3 py-2 border border-ui-border rounded-xl text-sm focus:outline-none focus:border-primary w-28" />
              <select name="status_id" className="px-3 py-2 border border-ui-border rounded-xl text-sm focus:outline-none focus:border-primary">
                <option value="">Status...</option>
                {statuses?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Btn type="submit">+ Crear</Btn>
            </form>
          ) : null
        }
      />

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Link href="/admin/proyectos">
          <span className={`inline-flex px-3 py-1.5 rounded-pill text-xs font-medium border transition-colors ${!searchParams.status ? "bg-primary text-white border-primary" : "bg-white border-ui-border text-foreground hover:border-primary"}`}>
            Todos
          </span>
        </Link>
        {statuses?.map((s: any) => (
          <Link key={s.id} href={`/admin/proyectos?status=${encodeURIComponent(s.name)}`}>
            <span className={`inline-flex px-3 py-1.5 rounded-pill text-xs font-medium border transition-colors ${searchParams.status === s.name ? "text-white border-transparent" : "bg-white border-ui-border text-foreground hover:border-primary"}`}
              style={searchParams.status === s.name ? { backgroundColor: s.color, borderColor: s.color } : {}}>
              {s.name}
            </span>
          </Link>
        ))}
      </div>

      <AdminCard>
        {!filtered.length ? (
          <EmptyState message="Sin proyectos." />
        ) : (
          <Table headers={["No. Proyecto", "Cliente", "Agente", "Aprobación", "Entrega prog.", "Entrega real", "Status", "Monto", ""]}>
            {filtered.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <Td><span className="font-mono text-xs font-semibold text-foreground">{p.project_number}</span></Td>
                <Td><span className="text-sm">{p.client?.name ?? "—"}</span></Td>
                <Td><span className="text-sm text-ui-gray">{p.agent?.full_name ?? "—"}</span></Td>
                <Td><span className="text-xs text-ui-gray">{fmt(p.approved_at)}</span></Td>
                <Td><span className="text-xs text-ui-gray">{fmt(p.scheduled_delivery_at)}</span></Td>
                <Td><span className="text-xs text-ui-gray">{fmt(p.delivered_at)}</span></Td>
                <Td>{p.status ? <Badge color={p.status.color}>{p.status.name}</Badge> : <span className="text-ui-gray text-xs">—</span>}</Td>
                <Td><span className="font-semibold text-sm">${Number(p.total_amount).toLocaleString("es-MX")}</span></Td>
                <Td><Link href={`/admin/proyectos/${p.id}`}><Btn size="sm" variant="secondary">Ver</Btn></Link></Td>
              </tr>
            ))}
          </Table>
        )}
      </AdminCard>
    </div>
  );
}
