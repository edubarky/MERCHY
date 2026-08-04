import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import PublicHeader from "@/components/PublicHeader";
import type { Product, Category, PriceTier } from "@/types";
import Pagination from "./components/Pagination";
import CatalogGridWithFilters from "./components/CatalogGridWithFilters";

const PAGE_SIZE = 12;

interface PageProps {
  searchParams: {
    categoria?: string;
    q?: string;
    pagina?: string;
  };
}

export const metadata = {
  title: "Catálogo — Merchy",
  description: "Explora nuestra colección de productos promocionales personalizados.",
};

export default async function CatalogoPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const categoria = searchParams.categoria ?? null;
  const query = searchParams.q ?? "";
  const page = Math.max(1, parseInt(searchParams.pagina ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Fetch categories and price tiers in parallel
  const [{ data: categories }, { data: priceTiers }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, icon, sort_order, active")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("price_tiers").select("*").order("qty_min"),
  ]);

  // Build products query
  let productsQuery = supabase
    .from("products")
    .select(
      `
      id, sku, name, description, category_id, composition,
      sizes_available, costo, active, created_at,
      category:categories(id, name, slug, icon, sort_order, active),
      variants:product_variants(id, product_id, sku, color_name, color_hex, images, stock, active)
    `,
      { count: "exact" }
    )
    .eq("active", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (categoria) {
    const cat = (categories ?? []).find((c: Category) => c.slug === categoria);
    if (cat) productsQuery = productsQuery.eq("category_id", cat.id);
  }

  if (query) {
    productsQuery = productsQuery.ilike("name", `%${query}%`);
  }

  const { data: products, count } = await productsQuery;

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const safeProducts = (products ?? []) as unknown as (Product & { variants: NonNullable<Product["variants"]> })[];
  const safeTiers = (priceTiers ?? []) as PriceTier[];
  const safeCategories = (categories ?? []) as Category[];

  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />
      <div className="bg-ui-surface border-b border-ui-border">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground">
            Catálogo
          </h1>
          <p className="text-ui-gray text-sm mt-1">
            Personaliza cualquier producto con tu logo o diseño
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Product grid */}
        <div>
          {safeProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="text-5xl mb-4">🔍</span>
              <h2 className="font-display font-semibold text-lg text-foreground">
                Sin resultados
              </h2>
              <p className="text-ui-gray text-sm mt-1">
                Intenta con otra búsqueda o categoría
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-ui-gray mb-4">
                {count} producto{count !== 1 ? "s" : ""}
                {categoria ? ` en ${safeCategories.find((c) => c.slug === categoria)?.name}` : ""}
              </p>
              <CatalogGridWithFilters products={safeProducts} priceTiers={safeTiers} />
              <Suspense>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  total={count ?? 0}
                  pageSize={PAGE_SIZE}
                />
              </Suspense>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
