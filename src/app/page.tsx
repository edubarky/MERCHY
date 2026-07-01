import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import FavoritosSection from "@/components/home/FavoritosSection";
import ContactForm from "@/components/home/ContactForm";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product, PriceTier } from "@/types";

export const metadata = {
  title: "Merchy — Productos Promocionales Personalizados",
  description: "Personaliza playeras, gorras, termos y más. Cotización instantánea. Entrega desde 1 pieza.",
};

const TRUST_ITEMS = [
  {
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: "Calidad premium",
    desc: "Materiales que destacan",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Envíos rápidos",
    desc: "A todo México",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Diseños sin límites",
    desc: "Tú imaginas, nosotros lo hacemos",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    title: "Atención experta",
    desc: "Te acompañamos siempre",
  },
];

const STATIC_CATEGORIES = [
  { name: "Bebidas", slug: "bebidas", emoji: "🥤" },
  { name: "Textiles", slug: "textiles", emoji: "👕" },
  { name: "Deportivo", slug: "deportivo", emoji: "⚽" },
];

const WHAT_WE_OFFER = [
  {
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Calidad",
    desc: "Excelencia en cada detalle.",
  },
  {
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Satisfacción",
    desc: "Materiales y acabados de alto nivel.",
  },
  {
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    title: "Entrega garantizada",
    desc: "Confianza de principio a fin.",
  },
];

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: categories }, { data: products }, { data: priceTiers }] = await Promise.all([
    supabase.from("categories").select("id, name, slug, icon, sort_order, active").eq("active", true).order("sort_order").limit(4),
    supabase.from("products").select(`
      id, sku, name, description, category_id, composition, sizes_available, costo, active, created_at,
      category:categories(id, name, slug, icon, sort_order, active),
      variants:product_variants(id, product_id, sku, color_name, color_hex, images, stock, active)
    `).eq("active", true).order("created_at", { ascending: false }).limit(8),
    supabase.from("price_tiers").select("*").order("qty_min"),
  ]);

  const safeProducts = (products ?? []) as unknown as (Product & { variants: NonNullable<Product["variants"]> })[];
  const safeTiers = (priceTiers ?? []) as PriceTier[];
  const safeCategories = (categories ?? []) as Category[];

  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#d4f5f3] via-[#e8faf9] to-[#f0fffe]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-12">
          {/* Left */}
          <div className="flex-1 max-w-lg">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 border border-primary/30 text-xs font-semibold text-foreground mb-6">
              <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              PERSONALIZA TU MARCA
            </span>
            <h1 className="font-display font-bold text-5xl lg:text-6xl leading-tight text-foreground">
              Imprime<br />lo que<br />
              <span className="text-primary">imaginas</span>
            </h1>
            <p className="mt-5 text-ui-gray text-base leading-relaxed">
              Productos personalizados<br />que hacen destacar tu marca.
            </p>
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 rounded-full bg-accent-coral text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Ver catálogo
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Right — diagram */}
          <div className="flex-1 relative flex items-center justify-center min-h-[340px] w-full max-w-lg">
            {/* White oval bg */}
            <div className="absolute inset-0 bg-white/50 rounded-[50%] blur-sm" />

            {/* Category chips */}
            <div className="absolute top-4 left-4 flex flex-col gap-4 z-10">
              {[
                { icon: "👕", name: "Ropa", sub: "para tu equipo" },
                { icon: "🎒", name: "Accesorios", sub: "que promocionan" },
                { icon: "☕", name: "Artículos", sub: "para cada ocasión" },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-ui-border">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{item.name}</p>
                    <p className="text-[10px] text-ui-gray">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Product visuals placeholder */}
            <div className="relative z-10 flex items-end gap-4 pt-12">
              <div className="w-36 h-44 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-6xl">👕</span>
              </div>
              <div className="w-28 h-32 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-ui-border mb-4">
                <span className="text-5xl">☕</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="bg-white border-b border-ui-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TRUST_ITEMS.map((item) => (
              <div key={item.title} className="flex items-center gap-3 p-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-ui-gray">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES GRID ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATIC_CATEGORIES.map((cat) => (
            <div key={cat.slug} className="relative bg-white rounded-card overflow-hidden shadow-sm border border-ui-border group flex flex-col min-h-[260px]">
              <div className="p-5 pb-2">
                <h3 className="font-display font-bold text-xl text-foreground">{cat.name}</h3>
                <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
              </div>
              {/* Product image area */}
              <div className="flex-1 flex items-end justify-center px-4 pb-0 relative overflow-hidden">
                <div className="w-full h-32 flex items-center justify-center">
                  <span className="text-7xl opacity-80">{cat.emoji}</span>
                </div>
              </div>
              {/* Explorar button */}
              <div className="p-4 pt-0">
                <Link
                  href={`/catalogo?categoria=${cat.slug}`}
                  className="flex items-center gap-2 w-full justify-center py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors group-hover:shadow-md"
                >
                  Explorar
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10M7 17V7h10" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}

          {/* Todas las categorías */}
          <div className="relative bg-gradient-to-br from-primary to-primary-dark rounded-card overflow-hidden shadow-sm flex flex-col min-h-[260px]">
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-white leading-tight">Todas las<br />categorías</h3>
                <p className="text-white/80 text-xs mt-2">Explora todo nuestro catálogo de productos</p>
              </div>
              <Link
                href="/catalogo"
                className="mt-2 w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-md"
              >
                <svg className="w-5 h-5 text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAVORITOS + DESTACA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <FavoritosSection products={safeProducts} priceTiers={safeTiers} categories={safeCategories} />

          {/* Destaca tu diseño */}
          <div className="flex flex-col gap-6 lg:pl-4 pt-2">
            <div>
              <h2 className="font-display font-bold text-3xl text-foreground leading-tight">
                Destaca tu diseño con{" "}
                <span className="text-primary">nuestros productos</span>
              </h2>
              <p className="mt-3 text-foreground font-medium">
                Obtén <strong>calidad</strong> que resalte tu identidad.
              </p>
            </div>
            {/* Feature image placeholder */}
            <div className="relative w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-card overflow-hidden flex items-center justify-center">
              <span className="text-8xl">🧴</span>
              {/* Callouts */}
              <div className="absolute right-4 top-6 flex flex-col gap-3">
                {[
                  { title: "Diseño premium", desc: "Acabados de alta calidad." },
                  { title: "Todo en uno", desc: "Diseña, cotiza y compra." },
                  { title: "100% personalizable", desc: "Hazlo a tu manera." },
                ].map((f) => (
                  <div key={f.title} className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-ui-border">
                    <p className="text-xs font-semibold text-primary">{f.title}</p>
                    <p className="text-[10px] text-ui-gray">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EXPERIENCE + LO QUE OFRECEMOS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Teal card */}
          <div className="bg-gradient-to-br from-primary to-primary-dark rounded-card p-10 flex flex-col justify-between min-h-[260px]">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display font-bold text-3xl text-white leading-tight">
                Experiencia que<br />
                <span className="text-white/90 italic">supera expectativas</span>
              </h2>
              <p className="mt-3 text-white/80 text-sm">
                Productos que combinan buen diseño<br />con la calidad que esperas.
              </p>
            </div>
            <Link
              href="/contacto"
              className="mt-8 inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-foreground font-semibold text-sm hover:shadow-md transition-shadow w-fit"
            >
              Contáctanos
            </Link>
          </div>

          {/* Lo que ofrecemos */}
          <div className="bg-white rounded-card p-10 flex flex-col justify-center border border-ui-border">
            <h2 className="font-display font-bold text-2xl text-foreground mb-8">Lo que ofrecemos</h2>
            <div className="flex flex-col gap-6">
              {WHAT_WE_OFFER.map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-ui-gray mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACTO ── */}
      <section className="bg-white border-t border-ui-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left */}
            <div>
              <span className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Estamos para ayudarte
              </span>
              <h2 className="font-display font-bold text-4xl text-foreground mb-1">Contáctanos</h2>
              <div className="w-10 h-1 bg-primary rounded-full mb-4" />
              <p className="text-ui-gray text-sm leading-relaxed mb-8">
                Cuéntanos sobre tu proyecto<br />y te respondemos lo antes posible.
              </p>
              <div className="flex items-end gap-4">
                <span className="text-7xl">👕</span>
                <span className="text-6xl mb-2">🧢</span>
              </div>
            </div>
            {/* Right — form */}
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-ui-border">
        {/* Contact strip */}
        <div className="border-b border-ui-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "📞", label: "Llámanos", value: "+52 000 000 000" },
              { icon: "✉️", label: "Escríbenos", value: "contacto@merchy.com" },
              { icon: "📍", label: "Visítanos", value: "CDMX, México" },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <p className="text-xs text-ui-gray">{c.label}</p>
                  <p className="text-sm font-semibold text-foreground">{c.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <img src="/logo.png" alt="Merchy" className="h-8 w-auto mb-3" />
            <p className="text-sm text-ui-gray leading-relaxed mb-4">
              Productos promocionales personalizados que impulsan tu marca.
            </p>
            <div className="flex gap-3">
              {["f", "in", "▶", "📷"].map((s, i) => (
                <button key={i} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-ui-gray hover:bg-primary/10 hover:text-primary transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            { title: "Empresa", links: ["Nosotros", "Catálogo", "Blog", "Contacto"] },
            { title: "Ayuda", links: ["Preguntas frecuentes", "Envíos y entregas", "Cambios y devoluciones", "Términos y condiciones"] },
            { title: "Recursos", links: ["Cotizador", "Plantillas", "Materiales", "Consejos de marca"] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-foreground mb-3">{col.title}</p>
              <div className="w-6 h-0.5 bg-primary rounded-full mb-4" />
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-ui-gray hover:text-primary transition-colors flex items-center gap-1.5">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-ui-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <p className="text-xs text-ui-gray">© 2026 Merchy. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
