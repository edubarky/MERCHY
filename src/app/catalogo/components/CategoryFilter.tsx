"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Category } from "@/types";

interface Props {
  categories: Category[];
  selected: string | null;
  total: number;
}

export default function CategoryFilter({ categories, selected, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("categoria", slug);
    } else {
      params.delete("categoria");
    }
    params.delete("pagina");
    router.push(`${pathname}?${params.toString()}`);
  }

  const all = [{ slug: null, name: "Todos", icon: "🛍️", sort_order: 0, id: "__all__", active: true }, ...categories];

  return (
    <>
      {/* Mobile: horizontal scrollable chips */}
      <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {all.map((cat) => {
          const isActive = cat.slug === selected || (cat.slug === null && !selected);
          return (
            <button
              key={cat.id}
              onClick={() => select(cat.slug)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-pill text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-primary text-white border-primary"
                  : "bg-ui-surface text-foreground border-ui-border hover:border-primary"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop: sidebar list */}
      <aside className="hidden lg:flex flex-col gap-1 w-52 flex-shrink-0">
        <p className="text-xs font-semibold text-ui-gray uppercase tracking-wider mb-2 px-3">
          Categorías
        </p>
        {all.map((cat) => {
          const isActive = cat.slug === selected || (cat.slug === null && !selected);
          return (
            <button
              key={cat.id}
              onClick={() => select(cat.slug)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full text-left ${
                isActive
                  ? "bg-teal-light text-primary font-semibold"
                  : "text-foreground hover:bg-gray-100"
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              <span className="flex-1">{cat.name}</span>
              {cat.slug === null && (
                <span className="text-xs text-ui-gray">{total}</span>
              )}
            </button>
          );
        })}
      </aside>
    </>
  );
}
