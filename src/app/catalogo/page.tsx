import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import PublicHeader from "@/components/PublicHeader";
import type { Product, Category, PriceTier } from "@/types";
import Pagination from "./components/Pagination";
import CatalogGridWithFilters from "./components/CatalogGridWithFilters";
import CategoryBar from "./components/CategoryBar";

const PAGE_SIZE = 12;

// Las tarjetas de categoría de la home (Bebidas/Textiles/Deportivo) agrupan
// varias categorías reales de la base de datos bajo un slug más amplio.
const CATEGORY_GROUPS: Record<string, string[]> = {
  bebidas: ["termos-y-bebidas"],
  textiles: ["playeras", "sudaderas", "gorras", "mochilas"],
  deportivo: ["deportivo"],
};

const CATEGORY_GROUP_LABELS: Record<string, string> = {
  bebidas: "Bebidas",
  textiles: "Textiles",
  deportivo: "Deportivo",
};

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
    const slugs = CATEGORY_GROUPS[categoria] ?? [categoria];
    const matchingIds = (categories ?? [])
      .filter((c: Category) => slugs.includes(c.slug))
      .map((c: Category) => c.id);
    // Always apply the filter, even when nothing matches (an empty `.in()`
    // array correctly returns zero rows) — an unrecognized/invalid
    // `categoria` value must show an empty catalog, not silently fall back
    // to showing everything.
    productsQuery = productsQuery.in("category_id", matchingIds);
  }

  if (query) {
    productsQuery = productsQuery.ilike("name", `%${query}%`);
  }

  const { data: products, count } = await productsQuery;

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const safeProducts = (products ?? []) as unknown as (Product & { variants: NonNullable<Product["variants"]> })[];
  const safeTiers = (priceTiers ?? []) as PriceTier[];
  const safeCategories = (categories ?? []) as Category[];

  const categoryLabel = categoria
    ? CATEGORY_GROUP_LABELS[categoria] ?? safeCategories.find((c) => c.slug === categoria)?.name ?? categoria
    : null;

  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />
      <CategoryBar />

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
              <CatalogGridWithFilters
                products={safeProducts}
                priceTiers={safeTiers}
                count={count ?? 0}
                categoryLabel={categoryLabel}
              />
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
