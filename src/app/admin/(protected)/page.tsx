import { createClient } from "@/lib/supabase/server";
import { PageHeader, AdminCard, Badge } from "@/components/admin/ui";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = createClient();

  const [
    { count: totalProducts },
    { count: totalClients },
    { count: totalProjects },
    { data: recentProjects },
    { data: statusCounts },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase
      .from("projects")
      .select("id, project_number, total_amount, approved_at, client:clients(name), status:production_statuses(name, color)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("projects")
      .select("status:production_statuses(name, color), count:id")
      .not("status_id", "is", null),
  ]);

  const stats = [
    { label: "Productos activos", value: totalProducts ?? 0, href: "/admin/productos" },
    { label: "Clientes", value: totalClients ?? 0, href: "/admin/clientes" },
    { label: "Proyectos totales", value: totalProjects ?? 0, href: "/admin/proyectos" },
  ];

  return (
    <div className="p-6 max-w-6xl">
      <PageHeader title="Dashboard" subtitle="Resumen de operaciones" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <AdminCard className="p-5 hover:border-primary transition-colors cursor-pointer">
              <p className="text-3xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-ui-gray mt-1">{s.label}</p>
            </AdminCard>
          </Link>
        ))}
      </div>

      {/* Recent projects */}
      <AdminCard>
        <div className="px-5 py-4 border-b border-ui-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Proyectos recientes</h2>
          <Link href="/admin/proyectos" className="text-sm text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        {!recentProjects?.length ? (
          <p className="text-center text-ui-gray text-sm py-10">Sin proyectos aún</p>
        ) : (
          <div className="divide-y divide-ui-border">
            {recentProjects.map((p: any) => (
              <Link
                key={p.id}
                href={`/admin/proyectos/${p.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.project_number}</p>
                  <p className="text-xs text-ui-gray">{p.client?.name ?? "Sin cliente"}</p>
                </div>
                <div className="flex items-center gap-3">
                  {p.status && <Badge color={p.status.color}>{p.status.name}</Badge>}
                  <span className="text-sm font-semibold text-foreground">
                    ${Number(p.total_amount).toLocaleString("es-MX")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
