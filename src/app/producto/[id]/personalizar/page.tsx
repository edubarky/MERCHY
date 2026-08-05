import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Product, ProductVariant, PriceTier, PrintTechnique } from "@/types";
import PersonalizerClient from "./PersonalizerClient";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("products").select("name").eq("id", params.id).single();
  if (!data) return { title: "Personalizar — Merchy" };
  return { title: `Personalizar ${data.name} — Merchy` };
}

export default async function PersonalizarPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: product }, { data: priceTiers }, { data: techniques }] = await Promise.all([
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
    supabase.from("print_techniques").select("*").eq("active", true).order("sort_order"),
  ]);

  if (!product) notFound();

  const safeProduct = product as unknown as Product & { variants: ProductVariant[] };

  return (
    <div className="min-h-screen bg-white">
      <PersonalizerClient
        product={safeProduct}
        priceTiers={(priceTiers ?? []) as PriceTier[]}
        techniques={(techniques ?? []) as PrintTechnique[]}
      />
    </div>
  );
}