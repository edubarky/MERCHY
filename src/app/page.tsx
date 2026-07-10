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


const STATIC_CATEGORIES = [
  {
    name: "Bebidas",
    slug: "bebidas",
    asset: "/Home/Barra%20de%20Productos/BEBIDAS.svg",
    badge: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2h4" />
        <path d="M9.5 2v3.2c0 .5-.2 1-.6 1.4L7.6 8c-.7.7-1.1 1.6-1.1 2.6V19a2 2 0 002 2h7a2 2 0 002-2v-8.4c0-1-.4-1.9-1.1-2.6L15 6.6a2 2 0 01-.6-1.4V2" />
        <path d="M7.5 13h9" />
      </svg>
    ),
  },
  {
    name: "Textiles",
    slug: "textiles",
    asset: "/Home/Barra%20de%20Productos/TEXTILES.svg",
    badge: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4v3M7 17v3M11 4v3M11 17v3M14 4v3M14 17v3M18 4v3M18 17v3" />
        <path d="M7 7c2 1.6 2 3.4 4 5s2-3.4 4-5 2 3.4 4 5" />
        <path d="M7 12c2 1.6 2 3.4 4 5s2-3.4 4-5 2 3.4 4 5" />
      </svg>
    ),
  },
  {
    name: "Deportivo",
    slug: "deportivo",
    asset: "/Home/Barra%20de%20Productos/DEPORTIVO.svg",
    badge: (
      <svg className="relative z-10 w-6 h-6" viewBox="264 65 17 17" fill="#2FCFCD" xmlns="http://www.w3.org/2000/svg">
        <path d="M281 73.5C281 78.1946 277.194 82 272.5 82C267.806 82 264 78.1946 264 73.5C264 68.8054 267.806 65 272.5 65C277.194 65 281 68.8058 281 73.5ZM272.506 67.5228L273.582 66.7357L273.432 66.2901C272.798 66.1993 272.205 66.1989 271.565 66.2894L271.422 66.7424L272.506 67.5228ZM271.898 70.5699L271.83 68.5471L270.37 67.4875C270.091 67.2844 270.019 66.9841 270.168 66.6152C268.54 67.1621 267.149 68.2885 266.272 69.7611C266.6 69.7265 266.889 69.8185 267.01 70.0977L267.787 71.8856L269.65 72.2069L271.898 70.5699ZM275.234 72.1179L276.85 71.309L277.416 69.3726C277.508 69.0554 277.808 68.9413 278.16 68.9409C277.288 67.8565 276.138 67.0502 274.839 66.6197C274.936 66.9173 274.953 67.2405 274.712 67.4181L273.058 68.6305L273.117 70.5842L275.234 72.1179ZM279.596 71.8728C279.441 71.2467 279.24 70.7081 278.96 70.1503L278.458 70.1597L278.083 71.4457L279.195 72.1983L279.596 71.8728ZM265.612 73.1269L266.61 72.2463L266.081 71.0193L265.643 71.065C265.436 71.6904 265.3 72.2805 265.251 72.9216L265.612 73.1269ZM273.697 75.331L274.435 73.0496L272.5 71.6461L270.564 73.0522L271.309 75.3363L273.697 75.331ZM278.379 77.7682C279.326 76.4755 279.799 74.9586 279.779 73.3919C279.779 73.3698 279.755 73.3191 279.742 73.3266L279.682 73.3596C279.466 73.5672 279.145 73.6408 278.883 73.4636L277.347 72.4261L275.647 73.277L274.816 75.8332L275.844 77.1391L277.718 77.1455C278.073 77.1496 278.275 77.397 278.379 77.7682ZM266.965 76.7221L268.941 76.8876L270.127 75.6531L269.391 73.402L267.513 73.0796L266.052 74.3648C265.844 74.5488 265.55 74.518 265.286 74.3705C265.389 75.3599 265.724 76.3246 266.242 77.1898C266.376 76.8467 266.622 76.6932 266.965 76.7221ZM274.574 80.4697C274.297 80.2591 274.114 80.0091 274.21 79.7144L274.828 77.8256L273.817 76.5438L270.969 76.5457L269.767 77.7877L270.172 79.5061C270.255 79.815 270.11 80.0853 269.82 80.2591C271.351 80.8724 273.022 80.9467 274.574 80.4697ZM268.889 79.3755L268.579 78.0801L267.251 77.9716L267.09 78.3526C267.527 78.8327 267.995 79.2464 268.542 79.5973L268.889 79.3755ZM277.434 78.8331L277.272 78.368L275.943 78.359L275.519 79.6281L275.929 79.9239C276.49 79.6015 276.972 79.2651 277.434 78.8331Z" />
      </svg>
    ),
  },
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
      {/* altura: hasta 540px, pero siempre deja el trust strip (124px) + header (64px) en pantalla */}
      <section className="relative overflow-hidden bg-[#E3FAF7]" style={{ height: "min(540px, calc(100vh - 210px))" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Home/FONDO.svg" alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full" style={{ objectFit: "fill" }} />

        {/* max-w-1280 centrado: a 1440px el blob blanco del FONDO empieza en x=551,
            la columna derecha arranca en x=550 (margin80 + px10*2 = nope, solo left:
            margin80 + padding40 + col430 = x550) — alineación casi perfecta */}
        <div className="relative z-10 max-w-[1280px] mx-auto px-10 h-full flex flex-col lg:flex-row py-8 lg:py-0">
          {/* Izquierda: ancho fijo 430px — centrado vertical y horizontal dentro del área teal */}
          <div className="flex-shrink-0 lg:w-[430px] h-full flex flex-col justify-center items-center">
            <div className="flex flex-col items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Home/PERSONALIZA-TU-MARCA.svg" alt="Personaliza tu marca" className="h-[42px] w-auto mb-4" />
              <h1 className="font-display font-bold text-[60px] leading-[1.05] text-foreground">
                Imprime<br />lo que<br />
                <span className="text-primary">imaginas</span>
              </h1>
              <p className="mt-3 text-ui-gray text-[15px] leading-relaxed">
                Productos personalizados<br />que hacen destacar tu marca.
              </p>
              <Link href="/catalogo" className="inline-block mt-5 hover:opacity-90 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Home/BOTON-VER-CATALOGO.svg" alt="Ver catálogo" className="h-[58px] w-auto" />
              </Link>
            </div>
          </div>

          {/* Derecha: ilustración centrada dentro del blob blanco */}
          <div className="flex-1 h-full flex items-center justify-center pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Home/Group 1157.svg" alt="Productos personalizados"
              className="max-h-[340px] w-auto" />
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="py-3 px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-[23px] shadow-[0_4px_8px_rgba(0,0,0,0.1)] flex flex-wrap items-center justify-around gap-4 py-5 px-6 lg:px-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Home/CALIDAD-PREMIUM.svg" alt="Calidad premium" className="h-[60px] w-auto" />
            <div className="hidden lg:block w-px h-9 bg-gray-200" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Home/ENVIOS-RAPIDOS.svg" alt="Envíos rápidos" className="h-[60px] w-auto" />
            <div className="hidden lg:block w-px h-9 bg-gray-200" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Home/DISENOS-SIN-LIMITES.svg" alt="Diseños sin límites" className="h-[60px] w-auto" />
            <div className="hidden lg:block w-px h-9 bg-gray-200" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Home/ATENCION-EXPERTA.svg" alt="Atención experta" className="h-[60px] w-auto" />
          </div>
        </div>
      </section>

      {/* ── CATEGORIES GRID ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {STATIC_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/catalogo?categoria=${cat.slug}`}
              className="group relative overflow-hidden rounded-[2.5rem] border border-ui-border bg-white shadow-[0_30px_80px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(0,0,0,0.16)] min-h-[440px]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(87,224,217,0.18),transparent_38%)]" />
              <div
                className={
                  cat.slug === "deportivo"
                    ? "absolute right-6 top-6 z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-teal-50/70 border border-teal-300 text-primary"
                    : "absolute right-6 top-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white/85 border border-teal-100 shadow-[0_12px_40px_rgba(31,199,188,0.15)] text-primary"
                }
              >
                {cat.slug === "deportivo" && (
                  <div className="absolute bottom-0 left-1/2 h-4 w-8 -translate-x-1/2 rounded-full bg-teal-300 opacity-70 blur-md" />
                )}
                {cat.badge}
              </div>

              {cat.slug === "bebidas" ? (
                <>
                  <div className="relative z-10 p-8 pb-0">
                    <h3 className="font-display font-bold text-3xl text-foreground">{cat.name}</h3>
                    <div className="mt-3 h-1.5 w-12 rounded-full bg-primary" />
                  </div>

                  {/* zona de producto: sin padding lateral propio, para poder usar casi todo el ancho real de la tarjeta */}
                  <div className="relative z-10" style={{ marginTop: "28px" }}>
                    {/* círculos decorativos: uno asoma por la izquierda, uno grande por la derecha (escalados junto con la composición) */}
                    <div className="absolute rounded-full" style={{ top: "107px", left: "-56px", height: "112px", width: "112px", background: "radial-gradient(circle, rgba(255,255,255,0) 30%, rgba(45,212,191,0.16) 50%, rgba(45,212,191,0.16) 68%, rgba(255,255,255,0) 92%)" }} />
                    <div className="absolute rounded-full" style={{ top: "56px", right: "-82px", height: "180px", width: "180px", background: "radial-gradient(circle, rgba(45,212,191,0.14) 0%, rgba(45,212,191,0.08) 45%, rgba(255,255,255,0) 78%)" }} />

                    {/* botella + termo + pedestal: ancho reducido a 78.5% de la tarjeta completa para que el alto total de la tarjeta iguale a Textiles (440px), alto automático (sin recorte) */}
                    <div className="relative z-10 mx-auto" style={{ width: "78.5%", aspectRatio: "289.7 / 409.6" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cat.asset} alt={`${cat.name} category`} className="h-full w-full" />
                    </div>

                    {/* difumina la franja plana del pedestal fotografiado que quedaba visible bajo el botón */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] bg-gradient-to-b from-transparent to-white" style={{ height: "42px" }} />

                    {/* botón: tamaño independiente del ancho de la imagen, superpuesto sobre la mitad inferior del frente del pedestal */}
                    <span
                      className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-primary to-primary-dark text-white text-lg font-semibold shadow-[0_18px_35px_rgba(30,203,194,0.28)] transition-transform duration-200 group-hover:-translate-y-0.5"
                      style={{ bottom: "18.61px", width: "78%", height: "50px" }}
                    >
                      Explorar
                      <svg className="w-6 h-6 flex-none" viewBox="0 0 21.44 27.48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path transform="translate(-140.562 -13)" fill="currentColor" d="M149.427 13C149.468 13 149.555 13.0213 149.601 13.026C152.629 13.329 154.716 16.5941 153.876 19.8204C153.552 19.4734 153.149 19.283 152.702 19.2603C153.056 17.5526 152.351 15.8413 151.031 14.9653C149.655 14.053 147.897 14.2459 146.714 15.3963C145.525 16.5526 145.154 18.3967 145.798 20.0072L145.797 22.3215C144.681 21.2083 144.127 19.6277 144.224 18.0186C144.383 15.3882 146.287 13.2574 148.689 13.0249C148.748 13.0193 148.796 13.0193 148.838 13H149.427H149.427Z" />
                        <path transform="translate(-140.562 -13)" fill="currentColor" d="M161.966 33.2179C161.798 36.8498 160.771 39.3606 157.291 40.1694C156.127 40.4399 154.924 40.4771 153.74 40.4312C152.953 40.4004 152.196 40.3058 151.43 40.1005C150.497 39.8504 149.668 39.3783 148.924 38.7255C148.757 38.5787 148.589 38.4768 148.431 38.3051L144.646 34.1905L141.642 30.923C140.562 29.7474 140.956 27.8433 141.999 26.8906C142.854 26.1093 144.426 26.1368 145.163 26.9304L146.745 28.6325V18.4379C146.745 17.5163 147.171 16.6882 147.855 16.2071C148.566 15.7075 149.475 15.6366 150.235 16.0598C151.002 16.4865 151.505 17.3367 151.51 18.2782L151.523 21.082C152.901 20.3164 154.393 21.0213 154.882 22.5528C155.59 22.0927 156.426 22.0185 157.151 22.3898C157.746 22.6945 158.167 23.2479 158.391 23.9398C159.311 23.2832 160.623 23.4358 161.356 24.3269C161.705 24.7514 161.988 25.3146 161.989 25.9178L162 32.3739C162.001 32.669 161.979 32.9311 161.966 33.2179ZM159.866 25.1185C159.51 25.0485 159.17 25.1261 158.899 25.3809C158.67 25.5969 158.511 25.9332 158.511 26.304L158.515 29.0867C158.516 29.5362 158.3 29.9218 157.867 29.9109C157.451 29.9003 157.241 29.5225 157.242 29.0867L157.244 24.9889C157.244 24.2829 156.625 23.8287 156.081 23.8242C155.538 23.8197 155.03 24.3112 155.025 24.9435L155.002 28.4583C155 28.8747 154.609 29.1318 154.27 29.071C153.884 29.0022 153.735 28.658 153.735 28.2441V23.589C153.735 23.2767 153.629 22.9748 153.423 22.7715C153.072 22.4265 152.553 22.3234 152.125 22.5595C151.81 22.7331 151.539 23.098 151.538 23.5075L151.53 27.132C151.529 27.5734 151.329 27.9526 150.915 27.9713C150.479 27.9915 150.242 27.6221 150.242 27.1654L150.233 18.5322C150.233 17.9607 149.775 17.5104 149.307 17.4552C148.62 17.3743 148.028 17.9422 148.027 18.6902L148.026 31.9793L144.474 28.1337C144.178 27.8137 143.7 27.8016 143.302 27.9178C142.958 28.0181 142.658 28.313 142.489 28.7162C142.308 29.1464 142.336 29.7006 142.666 30.0596L146.435 34.165L149.139 37.1094C150.278 38.3499 151.68 38.854 153.258 38.9991C154.004 39.0677 154.732 39.0727 155.48 39.0276C156.491 38.9669 157.555 38.7725 158.465 38.283C159.372 37.7955 160.024 36.9579 160.336 35.9063C160.511 35.3174 160.607 34.7251 160.656 34.1034C160.685 33.7321 160.712 33.3705 160.715 32.9953L160.725 31.5903L160.727 26.281C160.727 25.687 160.407 25.2252 159.865 25.1188L159.866 25.1185Z" />
                      </svg>
                    </span>
                  </div>
                </>
              ) : cat.slug === "textiles" ? (
                <>
                  <div className="relative z-10 p-8 pb-0">
                    <h3 className="font-display font-bold text-3xl text-foreground">{cat.name}</h3>
                    <div className="mt-3 h-1.5 w-12 rounded-full bg-primary" />
                  </div>

                  {/* zona de producto: sin padding lateral propio, para usar casi todo el ancho real de la tarjeta */}
                  <div className="relative z-10" style={{ marginTop: "22px" }}>
                    {/* círculos decorativos: anillo parcial a la izquierda, mancha grande y sutil a la derecha detrás de la camiseta */}
                    <div className="absolute rounded-full" style={{ top: "70px", left: "-55px", height: "110px", width: "110px", background: "radial-gradient(circle, rgba(255,255,255,0) 30%, rgba(45,212,191,0.16) 50%, rgba(45,212,191,0.16) 68%, rgba(255,255,255,0) 92%)" }} />
                    <div className="absolute rounded-full" style={{ top: "10px", right: "-90px", height: "230px", width: "230px", background: "radial-gradient(circle, rgba(45,212,191,0.13) 0%, rgba(45,212,191,0.07) 45%, rgba(255,255,255,0) 78%)" }} />

                    {/* camiseta + gorra + pedestal: ancho ~90% de la tarjeta completa, alto automático (sin recorte) */}
                    <div className="relative z-10 mx-auto" style={{ width: "90%", aspectRatio: "324.7 / 409.6" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cat.asset} alt={`${cat.name} category`} className="h-full w-full" />
                    </div>

                    {/* difumina la franja plana del pedestal fotografiado que quedaba visible bajo el botón */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] bg-gradient-to-b from-transparent to-white" style={{ height: "28px" }} />

                    {/* botón: tamaño independiente del ancho de la imagen, superpuesto sobre la mitad inferior del frente del pedestal */}
                    <span
                      className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-primary to-primary-dark text-white text-lg font-semibold shadow-[0_18px_35px_rgba(30,203,194,0.28)] transition-transform duration-200 group-hover:-translate-y-0.5"
                      style={{ bottom: "18px", width: "76%", height: "54px" }}
                    >
                      Explorar
                      <svg className="w-6 h-6 flex-none" viewBox="0 0 21.44 27.48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path transform="translate(-140.562 -13)" fill="currentColor" d="M149.427 13C149.468 13 149.555 13.0213 149.601 13.026C152.629 13.329 154.716 16.5941 153.876 19.8204C153.552 19.4734 153.149 19.283 152.702 19.2603C153.056 17.5526 152.351 15.8413 151.031 14.9653C149.655 14.053 147.897 14.2459 146.714 15.3963C145.525 16.5526 145.154 18.3967 145.798 20.0072L145.797 22.3215C144.681 21.2083 144.127 19.6277 144.224 18.0186C144.383 15.3882 146.287 13.2574 148.689 13.0249C148.748 13.0193 148.796 13.0193 148.838 13H149.427H149.427Z" />
                        <path transform="translate(-140.562 -13)" fill="currentColor" d="M161.966 33.2179C161.798 36.8498 160.771 39.3606 157.291 40.1694C156.127 40.4399 154.924 40.4771 153.74 40.4312C152.953 40.4004 152.196 40.3058 151.43 40.1005C150.497 39.8504 149.668 39.3783 148.924 38.7255C148.757 38.5787 148.589 38.4768 148.431 38.3051L144.646 34.1905L141.642 30.923C140.562 29.7474 140.956 27.8433 141.999 26.8906C142.854 26.1093 144.426 26.1368 145.163 26.9304L146.745 28.6325V18.4379C146.745 17.5163 147.171 16.6882 147.855 16.2071C148.566 15.7075 149.475 15.6366 150.235 16.0598C151.002 16.4865 151.505 17.3367 151.51 18.2782L151.523 21.082C152.901 20.3164 154.393 21.0213 154.882 22.5528C155.59 22.0927 156.426 22.0185 157.151 22.3898C157.746 22.6945 158.167 23.2479 158.391 23.9398C159.311 23.2832 160.623 23.4358 161.356 24.3269C161.705 24.7514 161.988 25.3146 161.989 25.9178L162 32.3739C162.001 32.669 161.979 32.9311 161.966 33.2179ZM159.866 25.1185C159.51 25.0485 159.17 25.1261 158.899 25.3809C158.67 25.5969 158.511 25.9332 158.511 26.304L158.515 29.0867C158.516 29.5362 158.3 29.9218 157.867 29.9109C157.451 29.9003 157.241 29.5225 157.242 29.0867L157.244 24.9889C157.244 24.2829 156.625 23.8287 156.081 23.8242C155.538 23.8197 155.03 24.3112 155.025 24.9435L155.002 28.4583C155 28.8747 154.609 29.1318 154.27 29.071C153.884 29.0022 153.735 28.658 153.735 28.2441V23.589C153.735 23.2767 153.629 22.9748 153.423 22.7715C153.072 22.4265 152.553 22.3234 152.125 22.5595C151.81 22.7331 151.539 23.098 151.538 23.5075L151.53 27.132C151.529 27.5734 151.329 27.9526 150.915 27.9713C150.479 27.9915 150.242 27.6221 150.242 27.1654L150.233 18.5322C150.233 17.9607 149.775 17.5104 149.307 17.4552C148.62 17.3743 148.028 17.9422 148.027 18.6902L148.026 31.9793L144.474 28.1337C144.178 27.8137 143.7 27.8016 143.302 27.9178C142.958 28.0181 142.658 28.313 142.489 28.7162C142.308 29.1464 142.336 29.7006 142.666 30.0596L146.435 34.165L149.139 37.1094C150.278 38.3499 151.68 38.854 153.258 38.9991C154.004 39.0677 154.732 39.0727 155.48 39.0276C156.491 38.9669 157.555 38.7725 158.465 38.283C159.372 37.7955 160.024 36.9579 160.336 35.9063C160.511 35.3174 160.607 34.7251 160.656 34.1034C160.685 33.7321 160.712 33.3705 160.715 32.9953L160.725 31.5903L160.727 26.281C160.727 25.687 160.407 25.2252 159.865 25.1188L159.866 25.1185Z" />
                      </svg>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative z-10 p-8 pb-0">
                    <h3 className="font-display font-bold text-3xl text-foreground">{cat.name}</h3>
                    <div className="mt-3 h-1.5 w-12 rounded-full bg-primary" />
                  </div>

                  {/* zona de producto: sin padding lateral propio, para usar casi todo el ancho real de la tarjeta */}
                  <div className="relative z-10" style={{ marginTop: "24px" }}>
                    {/* círculo decorativo grande y sutil detrás del producto */}
                    <div className="absolute rounded-full" style={{ top: "18px", left: "50%", transform: "translateX(-50%)", height: "230px", width: "230px", background: "radial-gradient(circle, rgba(45,212,191,0.13) 0%, rgba(45,212,191,0.07) 45%, rgba(255,255,255,0) 78%)" }} />

                    {/* tapete + pedestal: ancho ~94.5% de la tarjeta completa para que el alto total iguale a Bebidas/Textiles (440px), alto automático (sin recorte) */}
                    <div className="relative z-10 mx-auto" style={{ width: "94.5%", aspectRatio: "344.6 / 409.6" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cat.asset} alt={`${cat.name} category`} className="h-full w-full" />
                    </div>

                    {/* difumina la franja plana del pedestal fotografiado que quedaba visible bajo el botón */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] bg-gradient-to-b from-transparent to-white" style={{ height: "29px" }} />

                    {/* botón: tamaño independiente del ancho de la imagen, superpuesto sobre la mitad inferior del frente del pedestal */}
                    <span
                      className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-primary to-primary-dark text-white text-lg font-semibold shadow-[0_18px_35px_rgba(30,203,194,0.28)] transition-transform duration-200 group-hover:-translate-y-0.5"
                      style={{ bottom: "17.5px", width: "76%", height: "52px" }}
                    >
                      Explorar
                      <svg className="w-6 h-6 flex-none" viewBox="0 0 21.44 27.48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path transform="translate(-140.562 -13)" fill="currentColor" d="M149.427 13C149.468 13 149.555 13.0213 149.601 13.026C152.629 13.329 154.716 16.5941 153.876 19.8204C153.552 19.4734 153.149 19.283 152.702 19.2603C153.056 17.5526 152.351 15.8413 151.031 14.9653C149.655 14.053 147.897 14.2459 146.714 15.3963C145.525 16.5526 145.154 18.3967 145.798 20.0072L145.797 22.3215C144.681 21.2083 144.127 19.6277 144.224 18.0186C144.383 15.3882 146.287 13.2574 148.689 13.0249C148.748 13.0193 148.796 13.0193 148.838 13H149.427H149.427Z" />
                        <path transform="translate(-140.562 -13)" fill="currentColor" d="M161.966 33.2179C161.798 36.8498 160.771 39.3606 157.291 40.1694C156.127 40.4399 154.924 40.4771 153.74 40.4312C152.953 40.4004 152.196 40.3058 151.43 40.1005C150.497 39.8504 149.668 39.3783 148.924 38.7255C148.757 38.5787 148.589 38.4768 148.431 38.3051L144.646 34.1905L141.642 30.923C140.562 29.7474 140.956 27.8433 141.999 26.8906C142.854 26.1093 144.426 26.1368 145.163 26.9304L146.745 28.6325V18.4379C146.745 17.5163 147.171 16.6882 147.855 16.2071C148.566 15.7075 149.475 15.6366 150.235 16.0598C151.002 16.4865 151.505 17.3367 151.51 18.2782L151.523 21.082C152.901 20.3164 154.393 21.0213 154.882 22.5528C155.59 22.0927 156.426 22.0185 157.151 22.3898C157.746 22.6945 158.167 23.2479 158.391 23.9398C159.311 23.2832 160.623 23.4358 161.356 24.3269C161.705 24.7514 161.988 25.3146 161.989 25.9178L162 32.3739C162.001 32.669 161.979 32.9311 161.966 33.2179ZM159.866 25.1185C159.51 25.0485 159.17 25.1261 158.899 25.3809C158.67 25.5969 158.511 25.9332 158.511 26.304L158.515 29.0867C158.516 29.5362 158.3 29.9218 157.867 29.9109C157.451 29.9003 157.241 29.5225 157.242 29.0867L157.244 24.9889C157.244 24.2829 156.625 23.8287 156.081 23.8242C155.538 23.8197 155.03 24.3112 155.025 24.9435L155.002 28.4583C155 28.8747 154.609 29.1318 154.27 29.071C153.884 29.0022 153.735 28.658 153.735 28.2441V23.589C153.735 23.2767 153.629 22.9748 153.423 22.7715C153.072 22.4265 152.553 22.3234 152.125 22.5595C151.81 22.7331 151.539 23.098 151.538 23.5075L151.53 27.132C151.529 27.5734 151.329 27.9526 150.915 27.9713C150.479 27.9915 150.242 27.6221 150.242 27.1654L150.233 18.5322C150.233 17.9607 149.775 17.5104 149.307 17.4552C148.62 17.3743 148.028 17.9422 148.027 18.6902L148.026 31.9793L144.474 28.1337C144.178 27.8137 143.7 27.8016 143.302 27.9178C142.958 28.0181 142.658 28.313 142.489 28.7162C142.308 29.1464 142.336 29.7006 142.666 30.0596L146.435 34.165L149.139 37.1094C150.278 38.3499 151.68 38.854 153.258 38.9991C154.004 39.0677 154.732 39.0727 155.48 39.0276C156.491 38.9669 157.555 38.7725 158.465 38.283C159.372 37.7955 160.024 36.9579 160.336 35.9063C160.511 35.3174 160.607 34.7251 160.656 34.1034C160.685 33.7321 160.712 33.3705 160.715 32.9953L160.725 31.5903L160.727 26.281C160.727 25.687 160.407 25.2252 159.865 25.1188L159.866 25.1185Z" />
                      </svg>
                    </span>
                  </div>
                </>
              )}
            </Link>
          ))}

          {/* Todas las categorías */}
          <Link
            href="/catalogo"
            className="group relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-gradient-to-br from-[#dcf6f3] via-[#e9faf8] to-[#c9eeea] shadow-[0_30px_80px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(0,0,0,0.16)] min-h-[440px]"
          >
            {/* formas circulares abstractas de fondo */}
            <div className="absolute -left-14 top-6 h-52 w-52 rounded-full border border-white/50 bg-white/10" />
            <div className="absolute -right-16 top-1/3 h-64 w-64 rounded-full border border-white/40 bg-white/10" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.35),transparent_35%)]" />

            {/* panel interior translúcido */}
            <div className="absolute inset-3 rounded-[2rem] border border-white/60 bg-white/20 backdrop-blur-[2px]" />

            {/* composición completa: un único eje central vía flex-col + items-center, sin coordenadas manuales por elemento */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8">
              {/* badge: tamaño medio, notablemente más chico que el botón pero ya no diminuto */}
              <div
                className="flex items-center justify-center rounded-full bg-white shadow-[0_4px_8px_rgba(0,0,0,0.13)]"
                style={{ height: "58px", width: "58px" }}
              >
                <div className="grid grid-cols-3 gap-[3px]">
                  <span className="h-[6px] w-[6px] rounded-full bg-primary" />
                  <span className="h-[6px] w-[6px] rounded-full bg-primary" />
                  <span className="h-[6px] w-[6px] rounded-full bg-primary" />
                  <span className="h-[6px] w-[6px] rounded-full bg-primary" />
                  <span className="h-[6px] w-[6px] rounded-full bg-primary" />
                  <span className="h-[6px] w-[6px] rounded-full bg-ui-gray/40" />
                  <span className="h-[6px] w-[6px] rounded-full bg-primary" />
                  <span className="h-[6px] w-[6px] rounded-full bg-primary" />
                  <span className="h-[6px] w-[6px] rounded-full bg-accent-coral" />
                </div>
              </div>

              {/* bloque de texto: título, línea y descripción, centrados por el mismo eje flex */}
              <div className="text-center">
                <h3 className="mx-auto w-fit font-display font-bold text-center text-foreground" style={{ fontSize: "27px", lineHeight: "32px" }}>Todas las<br />categorías</h3>
                <div className="mx-auto rounded-full bg-primary" style={{ marginTop: "8px", height: "3px", width: "42px" }} />
                <p className="mx-auto w-fit text-center font-medium text-foreground" style={{ marginTop: "28px", fontSize: "15px", lineHeight: "17px" }}>Explora todo nuestro<br />catálogo de productos</p>
              </div>

              {/* botón: solo ligeramente más grande que el badge, mismo eje central */}
              <span
                className="flex items-center justify-center rounded-full bg-white text-accent-coral transition-transform group-hover:scale-105 shadow-[0_8px_20px_rgba(0,0,0,0.14)]"
                style={{ height: "66px", width: "66px" }}
              >
                <svg style={{ width: "30px", height: "30px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </Link>
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
