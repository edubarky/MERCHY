import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Product, ProductVariant, PriceTier } from "@/types";
import ProductDetail from "./ProductDetail";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("products").select("name, description").eq("id", params.id).single();
  if (!data) return { title: "Producto — Merchy" };
  return {
    title: `${data.name} — Merchy`,
    description: data.description ?? "Producto personalizable con tu logo o diseño.",
  };
}

export default async function ProductoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: product }, { data: priceTiers }] = await Promise.all([
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
  ]);

  if (!product) notFound();

  const safeProduct = product as unknown as Product & { variants: ProductVariant[] };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-ui-surface border-b border-ui-border">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <a href="/catalogo" className="inline-flex items-center gap-1.5 text-sm text-ui-gray hover:text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Merchy
          </a>
        </div>
      </div>

      <ProductDetail
        product={safeProduct}
        priceTiers={(priceTiers ?? []) as PriceTier[]}
      />
    </div>
  );
}
