import { createClient } from "@/lib/supabase/server";
import { PageHeader, AdminCard, Table, Td, Btn, EmptyState } from "@/components/admin/ui";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function toggleActive(id: string, active: boolean) {
  "use server";
  const { createClient: create } = await import("@/lib/supabase/server");
  const supabase = create();
  await supabase.from("products").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/productos");
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const q = searchParams.q ?? "";

  let query = supabase
    .from("products")
    .select("id, sku, name, active, costo, category:categories(name), supplier:suppliers(name), variants:product_variants(id)")
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: products } = await query;

  return (
    <div className="p-6 max-w-6xl">
      <PageHeader
        title="Productos"
        subtitle={`${products?.length ?? 0} productos`}
        action={
          <Link href="/admin/productos/nuevo">
            <Btn>+ Nuevo producto</Btn>
          </Link>
        }
      />

      <AdminCard>
        <div className="p-4 border-b border-ui-border">
          <form method="GET">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre..."
              className="w-full max-w-xs px-3 py-2 border border-ui-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </form>
        </div>

        {!products?.length ? (
          <EmptyState message="Sin productos. Crea el primero." />
        ) : (
          <Table headers={["SKU", "Nombre", "Categoría", "Proveedor", "Variantes", "Costo", "Estado", ""]}>
            {products.map((p: any) => (
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
                    <form action={toggleActive.bind(null, p.id, p.active)}>
                      <Btn variant="ghost" size="sm" type="submit">
                        {p.active ? "Desactivar" : "Activar"}
                      </Btn>
                    </form>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </AdminCard>
    </div>
  );
}
