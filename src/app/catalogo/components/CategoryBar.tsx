"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Each icon below is a single editable composite asset (icon + label baked
// into one SVG, from "CATÁLOGO DE PRODUCTOS") — rendered as-is, no separate
// text label is added on top of it. `categoria`/`q` describe which real
// filter this button applies (see printAreas-style mapping notes below);
// `label` is only used for alt/aria text, never rendered visibly (the SVG
// already draws its own label).
const CATEGORIES: { key: string; icon: string; label: string; categoria: string | null; q?: string }[] = [
  { key: "novedades", icon: "ICONO DE NOVEDADES.svg", label: "Más relevantes", categoria: null },
  { key: "playeras", icon: "ICONO DE PLAYERAS.svg", label: "Playeras", categoria: "playeras" },
  // "Hoodies" is the label on the editable asset; the real matching DB
  // category is "sudaderas" (no separate "hoodies" category exists).
  { key: "hoodies", icon: "ICONO DE HOODIES.svg", label: "Hoodies", categoria: "sudaderas" },
  { key: "gorras", icon: "ICONO DE GORRAS.svg", label: "Gorras", categoria: "gorras" },
  // "Tazas" and "Termos" share one real category ("termos-y-bebidas" — the
  // catalog has no separate cups/bottles split) — narrowed with the
  // existing name search (`q`) so each button still shows a distinct,
  // relevant subset once those products exist, reusing the search filter
  // already wired in page.tsx rather than inventing a new mechanism.
  { key: "tazas", icon: "ICONO DE TAZAS.svg", label: "Tazas", categoria: "termos-y-bebidas", q: "taza" },
  { key: "termos", icon: "ICONO DE TERMOS.svg", label: "Termos", categoria: "termos-y-bebidas", q: "termo" },
  { key: "mochilas", icon: "ICONO DE MOCHILAS.svg", label: "Mochilas", categoria: "mochilas" },
  // No "bolsas" category/products exist yet — links through anyway (matches
  // the reference bar exactly) and correctly resolves to an empty state
  // rather than silently showing everything, once no category matches.
  { key: "bolsas", icon: "ICONO DE BOLSAS.svg", label: "Bolsas", categoria: "bolsas" },
];

function iconSrc(file: string) {
  return `/Home/CATÁLOGO DE PRODUCTOS/${encodeURIComponent(file)}`;
}

function buildHref(categoria: string | null, q?: string) {
  const params = new URLSearchParams();
  if (categoria) params.set("categoria", categoria);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/catalogo?${qs}` : "/catalogo";
}

export default function CategoryBar() {
  const searchParams = useSearchParams();
  const activeCategoria = searchParams.get("categoria");
  const activeQ = searchParams.get("q");

  return (
    <div className="relative z-10 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6 overflow-x-auto py-4">
          {CATEGORIES.map((cat) => {
            const isActive = cat.categoria === (activeCategoria ?? null) && (cat.q ?? null) === (activeQ ?? null);
            return (
              <Link
                key={cat.key}
                href={buildHref(cat.categoria, cat.q)}
                className={`flex shrink-0 flex-col items-center border-b-2 pb-1.5 pt-1 transition-all duration-200 ease-out hover:opacity-70 ${
                  isActive ? "border-primary" : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={iconSrc(cat.icon)} alt={cat.label} className="h-11 w-auto sm:h-12" draggable={false} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}