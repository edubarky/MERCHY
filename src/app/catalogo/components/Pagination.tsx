"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Props {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export default function Pagination({ currentPage, totalPages, total, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goTo(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("pagina");
    } else {
      params.set("pagina", String(page));
    }
    router.push(`${pathname}?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  // Build page number list: always show first, last, current ±1, and ellipsis
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6">
      <p className="text-sm text-ui-gray">
        Mostrando {from}–{to} de {total} productos
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border border-ui-border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary transition-colors"
        >
          ← Anterior
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-ui-gray text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                p === currentPage
                  ? "bg-primary text-white"
                  : "border border-ui-border hover:border-primary"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg border border-ui-border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary transition-colors"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
