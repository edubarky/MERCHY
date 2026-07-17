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

// Profundidad: tarjeta centrada = escala 1 / opacidad 100%; tarjeta de borde = EDGE_SCALE / EDGE_OPACITY.
const EDGE_OPACITY = 0.92;
const EDGE_SCALE = 0.97;
const TWEEN_FACTOR_BASE = 0.2;

function numberWithinRange(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export default function FavoritosCarousel({ products, priceTiers }: Props) {
  const autoplay = useRef(
    Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true })
  );
  const wheelGestures = useRef(WheelGesturesPlugin({ forceWheelAxis: "x" }));
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: "start", containScroll: "trimSnaps", loop: false, duration: 37 },
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
      const diffToTarget = scrollSnap - scrollProgress;
      const slidesInSnap = api.internalEngine().slideRegistry[snapIndex] ?? [];

      slidesInSnap.forEach((slideIndex) => {
        if (isScrollEvent && !slidesInView.includes(slideIndex)) return;

        const tweenValue = numberWithinRange(1 - Math.abs(diffToTarget * tweenFactor.current), 0, 1);
        const opacity = EDGE_OPACITY + (1 - EDGE_OPACITY) * tweenValue;
        const scale = EDGE_SCALE + (1 - EDGE_SCALE) * tweenValue;

        const slideNode = api.slideNodes()[slideIndex];
        slideNode.style.opacity = opacity.toString();
        slideNode.style.transform = `scale(${scale})`;
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

  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  return (
    <div className="relative">
      <div className="relative overflow-hidden" ref={emblaRef}>
        <div className="-ml-6 flex cursor-grab touch-pan-y active:cursor-grabbing">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="min-w-0 shrink-0 grow-0 basis-[86%] pl-6 sm:basis-[62%] lg:basis-[45%]"
            >
              <FavoritoProductCard product={product} priceTiers={priceTiers} index={index} />
            </div>
          ))}
        </div>

        {/* Degradados en los bordes: insinúan que hay más productos, sin ocultar contenido */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent"
        />
      </div>

      <div className="mt-6 flex justify-center">
        <CarouselDots count={products.length} activeIndex={selectedIndex} onSelect={scrollTo} />
      </div>
    </div>
  );
}