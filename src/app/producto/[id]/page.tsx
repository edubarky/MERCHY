import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicHeader from "@/components/PublicHeader";
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
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#FAFAFA",
        backgroundImage:
          "radial-gradient(ellipse 900px 700px at 10% 0%, rgba(255,255,255,0.7), transparent 60%), " +
          "radial-gradient(ellipse 900px 700px at 92% 100%, rgba(0,0,0,0.02), transparent 60%), " +
          "radial-gradient(circle at 50% 35%, #FAFAFA 0%, #F4F4F4 100%)",
      }}
    >
      <PublicHeader />
      <ProductDetail
        product={safeProduct}
        priceTiers={(priceTiers ?? []) as PriceTier[]}
      />
    </div>
  );
}
