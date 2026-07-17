// Indicador de carrusel, calcado de "Group 986.svg" en /public/Home/FAVORITOS DEL MOMENTO/:
// 4 píldoras, la activa se alarga (40.4x16.9) en color primario, el resto quedan cortas y grises.
interface Props {
  count?: number;
  activeIndex?: number;
  onSelect?: (index: number) => void;
}

export default function CarouselDots({ count = 4, activeIndex = 0, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2" role="tablist" aria-label="Paginación de favoritos">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === activeIndex}
          aria-label={`Ir al producto ${i + 1}`}
          onClick={() => onSelect?.(i)}
          className={`h-[17px] rounded-pill transition-[width,background-color] duration-[250ms] ease-out ${
            i === activeIndex ? "w-10 bg-primary" : "w-6 bg-ui-border"
          }`}
        />
      ))}
    </div>
  );
}
