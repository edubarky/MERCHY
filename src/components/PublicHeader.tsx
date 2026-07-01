"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function PublicHeader() {
  const [exploreOpen, setExploreOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-ui-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Image src="/logo.png" alt="Merchy" width={120} height={40} className="h-9 w-auto" priority />
        </Link>

        {/* Explorar */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setExploreOpen((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-ui-border bg-white text-sm font-medium text-foreground hover:border-primary transition-colors"
          >
            <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Explorar
            <svg className="w-3.5 h-3.5 text-ui-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {exploreOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-ui-border rounded-2xl shadow-lg py-2 z-50">
              <Link href="/catalogo" onClick={() => setExploreOpen(false)} className="block px-4 py-2 text-sm text-foreground hover:bg-gray-50">Todo el catálogo</Link>
              <Link href="/catalogo?categoria=bebidas" onClick={() => setExploreOpen(false)} className="block px-4 py-2 text-sm text-foreground hover:bg-gray-50">Bebidas</Link>
              <Link href="/catalogo?categoria=textiles" onClick={() => setExploreOpen(false)} className="block px-4 py-2 text-sm text-foreground hover:bg-gray-50">Textiles</Link>
              <Link href="/catalogo?categoria=deportivo" onClick={() => setExploreOpen(false)} className="block px-4 py-2 text-sm text-foreground hover:bg-gray-50">Deportivo</Link>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <form action="/catalogo" method="get">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                name="q"
                type="text"
                placeholder="Buscar por nombre o tipo de producto..."
                className="w-full pl-9 pr-4 py-2 rounded-full border border-ui-border bg-gray-50 text-sm text-foreground placeholder:text-ui-gray focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </form>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Link href="/admin/login" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] text-ui-gray font-medium">Acceso</span>
          </Link>
          <button className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-[10px] text-ui-gray font-medium">Favoritos</span>
          </button>
          <button className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-[10px] text-ui-gray font-medium">Carrito</span>
          </button>
        </div>
      </div>
    </header>
  );
}
