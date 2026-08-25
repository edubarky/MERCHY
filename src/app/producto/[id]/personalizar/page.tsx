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

export default async function PersonalizarPage({
  params,
  searchParams,
}: {
  params: { id: string };
  // ?variant=<id> -- el color ya se eligió en la página del producto (ver
  // ProductDetail.tsx); este id identifica exactamente cuál variante, para
  // que el Personalizador cargue únicamente los ejes de ese color, sin
  // volver a preguntarlo. Ausente/inválido (ej. un link viejo) -> cae al
  // mismo fallback de siempre dentro de PersonalizerClient.
  // ?colors=<id1>,<id2>,... -- solo presente cuando el usuario activó
  // "Multicolor" y eligió más de un color; habilita la barra acotada de
  // colores dentro del Personalizador (ver PersonalizerClient).
  searchParams: { variant?: string; colors?: string };
}) {
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
  // Confirma que el id recibido corresponde a una variante real de ESTE
  // producto antes de pasarlo -- un id inválido/de otro producto se
  // descarta aquí mismo (queda null), en vez de dejar que el cliente lo
  // resuelva a ciegas.
  const initialVariantId = safeProduct.variants.some((v) => v.id === searchParams.variant)
    ? (searchParams.variant as string)
    : null;
  // Mismo criterio: solo ids reales de ESTE producto sobreviven. Si después
  // de filtrar queda 1 o 0 (ej. alguien manipuló la URL a mano), no hay
  // nada que alternar -> null, mismo resultado que "Multicolor apagado".
  const rawColorIds = (searchParams.colors ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const validColorIds = rawColorIds.filter((id) => safeProduct.variants.some((v) => v.id === id));
  const multicolorVariantIds = validColorIds.length > 1 ? validColorIds : null;

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
        initialVariantId={initialVariantId}
        multicolorVariantIds={multicolorVariantIds}
      />
    </div>
  );
}