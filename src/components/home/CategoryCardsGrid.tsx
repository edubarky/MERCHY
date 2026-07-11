import Link from "next/link";
import type { ReactNode } from "react";

type StaticCategory = {
  name: string;
  slug: string;
  asset: string;
  badge: ReactNode;
};

// marco turquesa al pasar el cursor por CUALQUIER parte de la tarjeta (hover directo del <Link>,
// no group-hover), sin useState ni JS: incluye la sombra de elevación existente + un borde
// turquesa de 2px + halo exterior difuso de baja opacidad + reflejo interior translúcido, todo en
// un único hover:shadow-[...] (no puede repartirse en dos utilidades hover:shadow separadas,
// ya que ambas fijarían la misma propiedad box-shadow y la última pisaría a la primera).
// Entrada 250ms (definida en la propia regla :hover) / salida 350ms (definida en la regla base),
// aprovechando que la transición usada es siempre la de la regla del estado de DESTINO.
const CARD_HOVER_RING =
  "hover:shadow-[0_30px_90px_rgba(0,0,0,0.16),0_0_0_2px_rgba(87,224,217,0.9),0_0_24px_6px_rgba(87,224,217,0.14),inset_0_0_0_1px_rgba(255,255,255,0.35)]";

export default function CategoryCardsGrid({ categories }: { categories: StaticCategory[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/catalogo?categoria=${cat.slug}`}
          className={`group relative overflow-hidden rounded-[2.5rem] border border-ui-border bg-white shadow-[0_30px_80px_rgba(0,0,0,0.12)] transition-[transform,box-shadow] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:duration-[250ms] hover:-translate-y-1 has-[.group\/btn:hover]:!translate-y-0 min-h-[440px] ${CARD_HOVER_RING}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(87,224,217,0.18),transparent_38%)]" />
          <div className="absolute right-6 top-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white/85 border border-teal-100 shadow-[0_12px_40px_rgba(31,199,188,0.15)] text-primary">
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
                {/* círculo decorativo grande por la derecha (escalado junto con la composición) */}
                <div className="absolute rounded-full" style={{ top: "56px", right: "-82px", height: "180px", width: "180px", background: "radial-gradient(circle, rgba(45,212,191,0.14) 0%, rgba(45,212,191,0.08) 45%, rgba(255,255,255,0) 78%)" }} />

                {/* botella + termo + pedestal: ancho reducido a 78.5% de la tarjeta completa para que el alto total de la tarjeta iguale a Textiles (440px), alto automático (sin recorte) */}
                <div className="relative z-10 mx-auto" style={{ width: "78.5%", aspectRatio: "289.7 / 409.6" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.asset} alt={`${cat.name} category`} className="h-full w-full" />
                </div>

                {/* difumina la franja plana del pedestal fotografiado que quedaba visible bajo el botón */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] bg-gradient-to-b from-transparent to-white" style={{ height: "42px" }} />
              </div>

              {/* botón: posición y tamaño compartidos con Textiles/Deportivo, relativos a la tarjeta (no a la imagen), para quedar perfectamente alineados */}
              <span
                className="group/btn absolute left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-2.5 overflow-hidden rounded-full bg-primary/35 text-lg font-medium text-[#3D3D3D] transition-[background-color,box-shadow] duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_6px_14px_rgba(0,0,0,0.08),0_16px_34px_rgba(87,224,217,0.15),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_0_0_1px_rgba(87,224,217,0.4)] hover:bg-accent-coral/35 hover:shadow-[0_6px_14px_rgba(0,0,0,0.08),0_16px_34px_rgba(255,116,101,0.17),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_0_0_1px_rgba(255,116,101,0.4)]"
                style={{
                  bottom: "21px",
                  width: "222px",
                  height: "52px",
                  backdropFilter: "blur(10px) saturate(140%)",
                  WebkitBackdropFilter: "blur(10px) saturate(140%)",
                }}
              >
                <span className="relative z-10">Explorar</span>
                <span className="relative z-10 inline-flex flex-none items-center justify-center">
                  {/* círculo del icono: turquesa (más intenso que la superficie) en normal, coral (más intenso que la superficie) en hover */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-full bg-primary-dark transition-colors duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/btn:bg-accent-coral"
                    style={{ width: "34px", height: "34px", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
                  />
                  <svg className="relative w-6 h-6 text-white" viewBox="0 0 21.44 27.48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path transform="translate(-140.562 -13)" fill="currentColor" d="M149.427 13C149.468 13 149.555 13.0213 149.601 13.026C152.629 13.329 154.716 16.5941 153.876 19.8204C153.552 19.4734 153.149 19.283 152.702 19.2603C153.056 17.5526 152.351 15.8413 151.031 14.9653C149.655 14.053 147.897 14.2459 146.714 15.3963C145.525 16.5526 145.154 18.3967 145.798 20.0072L145.797 22.3215C144.681 21.2083 144.127 19.6277 144.224 18.0186C144.383 15.3882 146.287 13.2574 148.689 13.0249C148.748 13.0193 148.796 13.0193 148.838 13H149.427H149.427Z" />
                    <path transform="translate(-140.562 -13)" fill="currentColor" d="M161.966 33.2179C161.798 36.8498 160.771 39.3606 157.291 40.1694C156.127 40.4399 154.924 40.4771 153.74 40.4312C152.953 40.4004 152.196 40.3058 151.43 40.1005C150.497 39.8504 149.668 39.3783 148.924 38.7255C148.757 38.5787 148.589 38.4768 148.431 38.3051L144.646 34.1905L141.642 30.923C140.562 29.7474 140.956 27.8433 141.999 26.8906C142.854 26.1093 144.426 26.1368 145.163 26.9304L146.745 28.6325V18.4379C146.745 17.5163 147.171 16.6882 147.855 16.2071C148.566 15.7075 149.475 15.6366 150.235 16.0598C151.002 16.4865 151.505 17.3367 151.51 18.2782L151.523 21.082C152.901 20.3164 154.393 21.0213 154.882 22.5528C155.59 22.0927 156.426 22.0185 157.151 22.3898C157.746 22.6945 158.167 23.2479 158.391 23.9398C159.311 23.2832 160.623 23.4358 161.356 24.3269C161.705 24.7514 161.988 25.3146 161.989 25.9178L162 32.3739C162.001 32.669 161.979 32.9311 161.966 33.2179ZM159.866 25.1185C159.51 25.0485 159.17 25.1261 158.899 25.3809C158.67 25.5969 158.511 25.9332 158.511 26.304L158.515 29.0867C158.516 29.5362 158.3 29.9218 157.867 29.9109C157.451 29.9003 157.241 29.5225 157.242 29.0867L157.244 24.9889C157.244 24.2829 156.625 23.8287 156.081 23.8242C155.538 23.8197 155.03 24.3112 155.025 24.9435L155.002 28.4583C155 28.8747 154.609 29.1318 154.27 29.071C153.884 29.0022 153.735 28.658 153.735 28.2441V23.589C153.735 23.2767 153.629 22.9748 153.423 22.7715C153.072 22.4265 152.553 22.3234 152.125 22.5595C151.81 22.7331 151.539 23.098 151.538 23.5075L151.53 27.132C151.529 27.5734 151.329 27.9526 150.915 27.9713C150.479 27.9915 150.242 27.6221 150.242 27.1654L150.233 18.5322C150.233 17.9607 149.775 17.5104 149.307 17.4552C148.62 17.3743 148.028 17.9422 148.027 18.6902L148.026 31.9793L144.474 28.1337C144.178 27.8137 143.7 27.8016 143.302 27.9178C142.958 28.0181 142.658 28.313 142.489 28.7162C142.308 29.1464 142.336 29.7006 142.666 30.0596L146.435 34.165L149.139 37.1094C150.278 38.3499 151.68 38.854 153.258 38.9991C154.004 39.0677 154.732 39.0727 155.48 39.0276C156.491 38.9669 157.555 38.7725 158.465 38.283C159.372 37.7955 160.024 36.9579 160.336 35.9063C160.511 35.3174 160.607 34.7251 160.656 34.1034C160.685 33.7321 160.712 33.3705 160.715 32.9953L160.725 31.5903L160.727 26.281C160.727 25.687 160.407 25.2252 159.865 25.1188L159.866 25.1185Z" />
                  </svg>
                </span>
              </span>
            </>
          ) : cat.slug === "textiles" ? (
            <>
              <div className="relative z-10 p-8 pb-0">
                <h3 className="font-display font-bold text-3xl text-foreground">{cat.name}</h3>
                <div className="mt-3 h-1.5 w-12 rounded-full bg-primary" />
              </div>

              {/* zona de producto: sin padding lateral propio, para usar casi todo el ancho real de la tarjeta */}
              <div className="relative z-10" style={{ marginTop: "22px" }}>
                {/* mancha decorativa grande y sutil a la derecha detrás de la camiseta */}
                <div className="absolute rounded-full" style={{ top: "10px", right: "-90px", height: "230px", width: "230px", background: "radial-gradient(circle, rgba(45,212,191,0.13) 0%, rgba(45,212,191,0.07) 45%, rgba(255,255,255,0) 78%)" }} />

                {/* camiseta + gorra + pedestal: ancho ~90% de la tarjeta completa, alto automático (sin recorte) */}
                <div className="relative z-10 mx-auto" style={{ width: "90%", aspectRatio: "324.7 / 409.6" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.asset} alt={`${cat.name} category`} className="h-full w-full" />
                </div>

                {/* difumina la franja plana del pedestal fotografiado que quedaba visible bajo el botón */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] bg-gradient-to-b from-transparent to-white" style={{ height: "28px" }} />
              </div>

              {/* botón: posición y tamaño compartidos con Bebidas/Deportivo, relativos a la tarjeta (no a la imagen), para quedar perfectamente alineados */}
              <span
                className="group/btn absolute left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-2.5 overflow-hidden rounded-full bg-primary/35 text-lg font-medium text-[#3D3D3D] transition-[background-color,box-shadow] duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_6px_14px_rgba(0,0,0,0.08),0_16px_34px_rgba(87,224,217,0.15),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_0_0_1px_rgba(87,224,217,0.4)] hover:bg-accent-coral/35 hover:shadow-[0_6px_14px_rgba(0,0,0,0.08),0_16px_34px_rgba(255,116,101,0.17),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_0_0_1px_rgba(255,116,101,0.4)]"
                style={{
                  bottom: "21px",
                  width: "222px",
                  height: "52px",
                  backdropFilter: "blur(10px) saturate(140%)",
                  WebkitBackdropFilter: "blur(10px) saturate(140%)",
                }}
              >
                <span className="relative z-10">Explorar</span>
                <span className="relative z-10 inline-flex flex-none items-center justify-center">
                  {/* círculo del icono: turquesa (más intenso que la superficie) en normal, coral (más intenso que la superficie) en hover */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-full bg-primary-dark transition-colors duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/btn:bg-accent-coral"
                    style={{ width: "34px", height: "34px", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
                  />
                  <svg className="relative w-6 h-6 text-white" viewBox="0 0 21.44 27.48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path transform="translate(-140.562 -13)" fill="currentColor" d="M149.427 13C149.468 13 149.555 13.0213 149.601 13.026C152.629 13.329 154.716 16.5941 153.876 19.8204C153.552 19.4734 153.149 19.283 152.702 19.2603C153.056 17.5526 152.351 15.8413 151.031 14.9653C149.655 14.053 147.897 14.2459 146.714 15.3963C145.525 16.5526 145.154 18.3967 145.798 20.0072L145.797 22.3215C144.681 21.2083 144.127 19.6277 144.224 18.0186C144.383 15.3882 146.287 13.2574 148.689 13.0249C148.748 13.0193 148.796 13.0193 148.838 13H149.427H149.427Z" />
                    <path transform="translate(-140.562 -13)" fill="currentColor" d="M161.966 33.2179C161.798 36.8498 160.771 39.3606 157.291 40.1694C156.127 40.4399 154.924 40.4771 153.74 40.4312C152.953 40.4004 152.196 40.3058 151.43 40.1005C150.497 39.8504 149.668 39.3783 148.924 38.7255C148.757 38.5787 148.589 38.4768 148.431 38.3051L144.646 34.1905L141.642 30.923C140.562 29.7474 140.956 27.8433 141.999 26.8906C142.854 26.1093 144.426 26.1368 145.163 26.9304L146.745 28.6325V18.4379C146.745 17.5163 147.171 16.6882 147.855 16.2071C148.566 15.7075 149.475 15.6366 150.235 16.0598C151.002 16.4865 151.505 17.3367 151.51 18.2782L151.523 21.082C152.901 20.3164 154.393 21.0213 154.882 22.5528C155.59 22.0927 156.426 22.0185 157.151 22.3898C157.746 22.6945 158.167 23.2479 158.391 23.9398C159.311 23.2832 160.623 23.4358 161.356 24.3269C161.705 24.7514 161.988 25.3146 161.989 25.9178L162 32.3739C162.001 32.669 161.979 32.9311 161.966 33.2179ZM159.866 25.1185C159.51 25.0485 159.17 25.1261 158.899 25.3809C158.67 25.5969 158.511 25.9332 158.511 26.304L158.515 29.0867C158.516 29.5362 158.3 29.9218 157.867 29.9109C157.451 29.9003 157.241 29.5225 157.242 29.0867L157.244 24.9889C157.244 24.2829 156.625 23.8287 156.081 23.8242C155.538 23.8197 155.03 24.3112 155.025 24.9435L155.002 28.4583C155 28.8747 154.609 29.1318 154.27 29.071C153.884 29.0022 153.735 28.658 153.735 28.2441V23.589C153.735 23.2767 153.629 22.9748 153.423 22.7715C153.072 22.4265 152.553 22.3234 152.125 22.5595C151.81 22.7331 151.539 23.098 151.538 23.5075L151.53 27.132C151.529 27.5734 151.329 27.9526 150.915 27.9713C150.479 27.9915 150.242 27.6221 150.242 27.1654L150.233 18.5322C150.233 17.9607 149.775 17.5104 149.307 17.4552C148.62 17.3743 148.028 17.9422 148.027 18.6902L148.026 31.9793L144.474 28.1337C144.178 27.8137 143.7 27.8016 143.302 27.9178C142.958 28.0181 142.658 28.313 142.489 28.7162C142.308 29.1464 142.336 29.7006 142.666 30.0596L146.435 34.165L149.139 37.1094C150.278 38.3499 151.68 38.854 153.258 38.9991C154.004 39.0677 154.732 39.0727 155.48 39.0276C156.491 38.9669 157.555 38.7725 158.465 38.283C159.372 37.7955 160.024 36.9579 160.336 35.9063C160.511 35.3174 160.607 34.7251 160.656 34.1034C160.685 33.7321 160.712 33.3705 160.715 32.9953L160.725 31.5903L160.727 26.281C160.727 25.687 160.407 25.2252 159.865 25.1188L159.866 25.1185Z" />
                  </svg>
                </span>
              </span>
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
              </div>

              {/* botón: posición y tamaño compartidos con Bebidas/Textiles, relativos a la tarjeta (no a la imagen), para quedar perfectamente alineados */}
              <span
                className="group/btn absolute left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-2.5 overflow-hidden rounded-full bg-primary/35 text-lg font-medium text-[#3D3D3D] transition-[background-color,box-shadow] duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_6px_14px_rgba(0,0,0,0.08),0_16px_34px_rgba(87,224,217,0.15),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_0_0_1px_rgba(87,224,217,0.4)] hover:bg-accent-coral/35 hover:shadow-[0_6px_14px_rgba(0,0,0,0.08),0_16px_34px_rgba(255,116,101,0.17),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_0_0_1px_rgba(255,116,101,0.4)]"
                style={{
                  bottom: "21px",
                  width: "222px",
                  height: "52px",
                  backdropFilter: "blur(10px) saturate(140%)",
                  WebkitBackdropFilter: "blur(10px) saturate(140%)",
                }}
              >
                <span className="relative z-10">Explorar</span>
                <span className="relative z-10 inline-flex flex-none items-center justify-center">
                  {/* círculo del icono: turquesa (más intenso que la superficie) en normal, coral (más intenso que la superficie) en hover */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-full bg-primary-dark transition-colors duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/btn:bg-accent-coral"
                    style={{ width: "34px", height: "34px", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
                  />
                  <svg className="relative w-6 h-6 text-white" viewBox="0 0 21.44 27.48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path transform="translate(-140.562 -13)" fill="currentColor" d="M149.427 13C149.468 13 149.555 13.0213 149.601 13.026C152.629 13.329 154.716 16.5941 153.876 19.8204C153.552 19.4734 153.149 19.283 152.702 19.2603C153.056 17.5526 152.351 15.8413 151.031 14.9653C149.655 14.053 147.897 14.2459 146.714 15.3963C145.525 16.5526 145.154 18.3967 145.798 20.0072L145.797 22.3215C144.681 21.2083 144.127 19.6277 144.224 18.0186C144.383 15.3882 146.287 13.2574 148.689 13.0249C148.748 13.0193 148.796 13.0193 148.838 13H149.427H149.427Z" />
                    <path transform="translate(-140.562 -13)" fill="currentColor" d="M161.966 33.2179C161.798 36.8498 160.771 39.3606 157.291 40.1694C156.127 40.4399 154.924 40.4771 153.74 40.4312C152.953 40.4004 152.196 40.3058 151.43 40.1005C150.497 39.8504 149.668 39.3783 148.924 38.7255C148.757 38.5787 148.589 38.4768 148.431 38.3051L144.646 34.1905L141.642 30.923C140.562 29.7474 140.956 27.8433 141.999 26.8906C142.854 26.1093 144.426 26.1368 145.163 26.9304L146.745 28.6325V18.4379C146.745 17.5163 147.171 16.6882 147.855 16.2071C148.566 15.7075 149.475 15.6366 150.235 16.0598C151.002 16.4865 151.505 17.3367 151.51 18.2782L151.523 21.082C152.901 20.3164 154.393 21.0213 154.882 22.5528C155.59 22.0927 156.426 22.0185 157.151 22.3898C157.746 22.6945 158.167 23.2479 158.391 23.9398C159.311 23.2832 160.623 23.4358 161.356 24.3269C161.705 24.7514 161.988 25.3146 161.989 25.9178L162 32.3739C162.001 32.669 161.979 32.9311 161.966 33.2179ZM159.866 25.1185C159.51 25.0485 159.17 25.1261 158.899 25.3809C158.67 25.5969 158.511 25.9332 158.511 26.304L158.515 29.0867C158.516 29.5362 158.3 29.9218 157.867 29.9109C157.451 29.9003 157.241 29.5225 157.242 29.0867L157.244 24.9889C157.244 24.2829 156.625 23.8287 156.081 23.8242C155.538 23.8197 155.03 24.3112 155.025 24.9435L155.002 28.4583C155 28.8747 154.609 29.1318 154.27 29.071C153.884 29.0022 153.735 28.658 153.735 28.2441V23.589C153.735 23.2767 153.629 22.9748 153.423 22.7715C153.072 22.4265 152.553 22.3234 152.125 22.5595C151.81 22.7331 151.539 23.098 151.538 23.5075L151.53 27.132C151.529 27.5734 151.329 27.9526 150.915 27.9713C150.479 27.9915 150.242 27.6221 150.242 27.1654L150.233 18.5322C150.233 17.9607 149.775 17.5104 149.307 17.4552C148.62 17.3743 148.028 17.9422 148.027 18.6902L148.026 31.9793L144.474 28.1337C144.178 27.8137 143.7 27.8016 143.302 27.9178C142.958 28.0181 142.658 28.313 142.489 28.7162C142.308 29.1464 142.336 29.7006 142.666 30.0596L146.435 34.165L149.139 37.1094C150.278 38.3499 151.68 38.854 153.258 38.9991C154.004 39.0677 154.732 39.0727 155.48 39.0276C156.491 38.9669 157.555 38.7725 158.465 38.283C159.372 37.7955 160.024 36.9579 160.336 35.9063C160.511 35.3174 160.607 34.7251 160.656 34.1034C160.685 33.7321 160.712 33.3705 160.715 32.9953L160.725 31.5903L160.727 26.281C160.727 25.687 160.407 25.2252 159.865 25.1188L159.866 25.1185Z" />
                  </svg>
                </span>
              </span>
            </>
          )}
        </Link>
      ))}

      {/* Todas las categorías */}
      <Link
        href="/catalogo"
        className={`group relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-gradient-to-br from-[#dcf6f3] via-[#e9faf8] to-[#c9eeea] shadow-[0_30px_80px_rgba(0,0,0,0.12)] transition-[transform,box-shadow] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:duration-[250ms] hover:-translate-y-1 min-h-[440px] ${CARD_HOVER_RING}`}
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
            className="flex items-center justify-center rounded-full bg-white text-accent-coral shadow-[0_8px_20px_rgba(0,0,0,0.14)] transition-[background-color,color,box-shadow,transform] duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:-translate-y-0.5 group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.14),0_0_26px_rgba(87,224,217,0.28)]"
            style={{ height: "66px", width: "66px" }}
          >
            <svg style={{ width: "30px", height: "30px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>
      </Link>
    </div>
  );
}
