"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import type { Product, PriceTier } from "@/types";
import FavoritoProductCard from "@/components/home/FavoritoProductCard";
import CarouselDots from "@/components/home/CarouselDots";

interface Props {
  products: (Product & { variants: NonNullable<Product["variants"]> })[];
  priceTiers: PriceTier[];
}

// Cuánto se atenúan las tarjetas fuera del centro (1 = centrada, EDGE_OPACITY = borde).
const EDGE_OPACITY = 0.93;
const TWEEN_FACTOR_BASE = 0.2;
const PARALLAX_PX = 10;

function numberWithinRange(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="#076868"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FavoritosCarousel({ products, priceTiers }: Props) {
  const autoplay = useRef(
    Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true })
  );
  const wheelGestures = useRef(WheelGesturesPlugin({ forceWheelAxis: "x" }));
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: "start", containScroll: "trimSnaps", loop: false, duration: 34 },
    [autoplay.current, wheelGestures.current]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tweenFactor = useRef(0);

  const setTweenFactor = useCallback((api: NonNullable<typeof emblaApi>) => {
    tweenFactor.current = TWEEN_FACTOR_BASE * api.scrollSnapList().length;
  }, []);

  const tweenSlides = useCallback((api: NonNullable<typeof emblaApi>, eventName?: string) => {
    const scrollProgress = api.scrollProgress();
    const slidesInView = api.slidesInView();
    const isScrollEvent = eventName === "scroll";

    api.scrollSnapList().forEach((scrollSnap, snapIndex) => {
      let diffToTarget = scrollSnap - scrollProgress;
      const slidesInSnap = api.internalEngine().slideRegistry[snapIndex] ?? [];

      slidesInSnap.forEach((slideIndex) => {
        if (isScrollEvent && !slidesInView.includes(slideIndex)) return;

        const tweenValue = 1 - Math.abs(diffToTarget * tweenFactor.current);
        const opacity = EDGE_OPACITY + (1 - EDGE_OPACITY) * numberWithinRange(tweenValue, 0, 1);
        const translate = numberWithinRange(diffToTarget * tweenFactor.current, -1, 1) * PARALLAX_PX;

        const slideNode = api.slideNodes()[slideIndex];
        slideNode.style.opacity = opacity.toString();
        slideNode.style.transform = `translateX(${-translate}px)`;
      });
    });
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    setTweenFactor(emblaApi);
    tweenSlides(emblaApi);

    function onSelect(api: NonNullable<typeof emblaApi>) {
      setSelectedIndex(api.selectedScrollSnap());
    }

    emblaApi.on("reInit", setTweenFactor);
    emblaApi.on("reInit", tweenSlides);
    emblaApi.on("scroll", tweenSlides);
    emblaApi.on("slideFocus", tweenSlides);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);

    return () => {
      emblaApi.off("reInit", setTweenFactor);
      emblaApi.off("reInit", tweenSlides);
      emblaApi.off("scroll", tweenSlides);
      emblaApi.off("slideFocus", tweenSlides);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, setTweenFactor, tweenSlides]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  return (
    <div className="group/carousel relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-2 flex touch-pan-y">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="min-w-0 shrink-0 grow-0 basis-[86%] pl-2 sm:basis-[62%] lg:basis-[44%]"
            >
              <FavoritoProductCard product={product} priceTiers={priceTiers} index={index} />
            </div>
          ))}
        </div>
      </div>

      {/* Flechas: ocultas hasta que el cursor entra al carrusel */}
      <button
        type="button"
        onClick={scrollPrev}
        aria-label="Producto anterior"
        className="absolute left-2 top-[calc(50%-28px)] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-md transition-opacity duration-200 ease-out group-hover/carousel:opacity-100 hover:bg-white/90"
      >
        <ChevronIcon direction="left" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Producto siguiente"
        className="absolute right-2 top-[calc(50%-28px)] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-md transition-opacity duration-200 ease-out group-hover/carousel:opacity-100 hover:bg-white/90"
      >
        <ChevronIcon direction="right" />
      </button>

      <div className="mt-6 flex justify-center">
        <CarouselDots count={products.length} activeIndex={selectedIndex} onSelect={scrollTo} />
      </div>
    </div>
  );
}