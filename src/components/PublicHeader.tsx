import Link from "next/link";
import Image from "next/image";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-ui-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="Merchy" width={120} height={40} className="h-9 w-auto" priority />
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link href="/" className="px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-gray-100 transition-colors">
            Inicio
          </Link>
          <Link href="/catalogo" className="px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-gray-100 transition-colors">
            Catálogo
          </Link>
          <Link href="/contacto" className="px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-gray-100 transition-colors">
            Contacto
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Cart */}
          <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-ui-border text-foreground hover:border-primary hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
          {/* User */}
          <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-ui-border text-foreground hover:border-primary hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
