"use client";

// Discreet, informational-only notice — no rectangle, no corner brackets,
// no visual "print area" indicator of any kind. The user has full freedom
// to place/scale/rotate their design anywhere on the product; this is the
// ONLY feedback the editor gives when part of the currently-selected
// design sits outside the product photo itself (see DesignElementView's
// isWithinCanvas). It never moves, resizes, or blocks anything — purely a
// heads-up the user can act on or ignore.
export default function PrintAreaGuide({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-accent-coral shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-opacity duration-200 ease-out"
    >
      Parte del diseño está fuera de la superficie del producto.
    </div>
  );
}