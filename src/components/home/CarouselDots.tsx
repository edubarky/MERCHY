// Indicador de carrusel, calcado de "Group 986.svg" en /public/Home/FAVORITOS DEL MOMENTO/:
// 4 píldoras, la activa se alarga (40.4x16.9) en color primario, el resto quedan cortas y grises.
interface Props {
  count?: number;
  activeIndex?: number;
}

export default function CarouselDots({ count = 4, activeIndex = 0 }: Props) {
  return (
    <div className="flex items-center gap-2" role="tablist" aria-label="Paginación de favoritos">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          role="tab"
          aria-selected={i === activeIndex}
          className={`h-[17px] rounded-pill transition-all ${
            i === activeIndex ? "w-10 bg-primary" : "w-6 bg-ui-border"
          }`}
        />
      ))}
    </div>
  );
}
