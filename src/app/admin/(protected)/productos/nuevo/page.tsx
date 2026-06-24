import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, AdminCard, FieldLabel, AdminInput, AdminTextarea, AdminSelect, Btn } from "@/components/admin/ui";
import Link from "next/link";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Único"];

async function createProduct(formData: FormData) {
  "use server";
  const { createClient: create } = await import("@/lib/supabase/server");
  const supabase = create();

  const sizes = formData.getAll("sizes") as string[];

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      composition: (formData.get("composition") as string) || null,
      category_id: (formData.get("category_id") as string) || null,
      supplier_id: (formData.get("supplier_id") as string) || null,
      sizes_available: sizes,
      costo: parseFloat(formData.get("costo") as string),
      active: true,
    })
    .select("id")
    .single();

  if (error || !data) return;
  redirect(`/admin/productos/${data.id}`);
}

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

      <AdminCard className="p-6">
        <form action={createProduct} className="space-y-5">
          <div>
            <FieldLabel required>Nombre</FieldLabel>
            <AdminInput name="name" required placeholder="Playera manga corta" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Categoría</FieldLabel>
              <AdminSelect name="category_id" required>
                <option value="">Seleccionar...</option>
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </AdminSelect>
            </div>
            <div>
              <FieldLabel>Proveedor</FieldLabel>
              <AdminSelect name="supplier_id">
                <option value="">Sin proveedor</option>
                {suppliers?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </AdminSelect>
            </div>
          </div>

          <div>
            <FieldLabel>Descripción</FieldLabel>
            <AdminTextarea name="description" placeholder="Descripción del producto para el catálogo..." />
          </div>

          <div>
            <FieldLabel>Composición</FieldLabel>
            <AdminInput name="composition" placeholder="100% algodón, 180 g/m²" />
          </div>

          <div>
            <FieldLabel>Tallas disponibles</FieldLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              {SIZES.map((size) => (
                <label key={size} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" name="sizes" value={size} className="accent-primary w-4 h-4" />
                  <span className="text-sm">{size}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-ui-gray mt-1">Deja vacío si el producto no tiene tallas</p>
          </div>

          <div className="w-40">
            <FieldLabel required>Costo (MXN)</FieldLabel>
            <AdminInput name="costo" type="number" step="0.01" min="0" required placeholder="0.00" />
          </div>

          <div className="pt-2 border-t border-ui-border flex justify-end">
            <Btn type="submit">Guardar y agregar colores →</Btn>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}
