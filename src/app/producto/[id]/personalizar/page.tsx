import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Product, ProductVariant, PriceTier, PrintTechnique } from "@/types";
import PersonalizerClient from "./PersonalizerClient";
import { resolveProductViewAssets } from "./resolveProductAssets";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("products").select("name").eq("id", params.id).single();
  if (!data) return { title: "Personalizar — Merchy" };
  return { title: `Personalizar ${data.name} — Merchy` };
}

export default async function PersonalizarPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: product }, { data: priceTiers }, { data: productTechniqueLinks }] = await Promise.all([
    supabase
      .from("products")
      .select(`
        id, sku, name, description, composition, sizes_available, costo, active,
        category:categories(id, name, slug, icon, sort_order, active),
        variants:product_variants(id, product_id, sku, color_name, color_hex, images, stock, active)
      `)
      .eq("id", params.id)
      .eq("active", true)
      .single(),
    supabase.from("price_tiers").select("*").order("qty_min"),
    // Qué técnicas están asignadas a ESTE producto (Productos → Editar →
    // Técnicas, en el admin) — nunca por categoría ni ninguna otra regla
    // automática. Un producto sin ninguna fila aquí no muestra ninguna
    // técnica (ver el estado vacío en PersonalizerClient), no un fallback
    // genérico.
    supabase.from("product_print_techniques").select("technique_id").eq("product_id", params.id),
  ]);

  if (!product) notFound();

  const safeProduct = product as unknown as Product & { variants: ProductVariant[] };
  const resolvedAssets = resolveProductViewAssets(safeProduct);

  const assignedTechniqueIds = (productTechniqueLinks ?? []).map((r) => r.technique_id);
  const { data: techniques } =
    assignedTechniqueIds.length > 0
      ? await supabase.from("print_techniques").select("*").in("id", assignedTechniqueIds).eq("active", true).order("sort_order")
      : { data: [] as PrintTechnique[] };

  return (
    <div className="min-h-screen bg-white">
      <PersonalizerClient
        product={safeProduct}
        priceTiers={(priceTiers ?? []) as PriceTier[]}
        techniques={(techniques ?? []) as PrintTechnique[]}
        resolvedAssets={resolvedAssets}
      />
    </div>
  );
}