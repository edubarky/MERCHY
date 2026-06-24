import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import Link from "next/link";
import { Btn } from "@/components/admin/ui";
import NuevoProductoForm from "./NuevoProductoForm";

export default async function NuevoProductoPage() {
  const supabase = createClient();
  const [{ data: categories }, { data: suppliers }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
  ]);

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Nuevo producto"
        action={<Link href="/admin/productos"><Btn variant="secondary">← Cancelar</Btn></Link>}
      />
      <NuevoProductoForm
        categories={categories ?? []}
        initialSuppliers={suppliers ?? []}
      />
    </div>
  );
}
