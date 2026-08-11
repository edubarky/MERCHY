// Text-tool font library. Deliberately isolated to this one file, imported
// only from the Personalizador's own components (SelectionToolbar,
// DesignElementView, PreviewModal) — never from the root layout — so the
// rest of the site never pays for any of these fonts. Reuses the exact
// same mechanism already used for the site's default font (next/font/google
// in src/app/layout.tsx): self-hosted at build time, zero extra runtime
// requests, automatic metric-matched fallback font (no layout shift while
// loading). Each font is its own separate loader call here (a second,
// independent instance from any same-named font in layout.tsx) since
// next/font's `.style.fontFamily` value is only available from the call
// that produced it — this is the documented, supported way to consume
// next/font without touching the `.variable`/CSS-custom-property approach.
import {
  DM_Sans,
  Outfit,
  Inter,
  Manrope,
  Montserrat,
  Poppins,
  Plus_Jakarta_Sans,
  Nunito_Sans,
  Roboto,
  Open_Sans,
  Lato,
  Work_Sans,
  Raleway,
  Playfair_Display,
  Lora,
  Merriweather,
  Libre_Baskerville,
  Cormorant_Garamond,
  DM_Serif_Display,
  Bebas_Neue,
  Oswald,
  Anton,
  Archivo_Black,
  Barlow_Condensed,
  League_Spartan,
  Space_Mono,
  IBM_Plex_Mono,
  Roboto_Mono,
} from "next/font/google";

// Variable fonts: no `weight` needed (full range loads, real — not
// synthesized — weights render for the Negrita toggle). `style` is only
// requested for families that actually ship italic files; families without
// one (styles: ["normal"] in Google's own metadata) fall back to the
// browser's synthesized oblique when Cursiva is toggled, same as any
// non-italic webfont normally does.
const dmSans = DM_Sans({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
const outfit = Outfit({ subsets: ["latin"], display: "swap" });
const inter = Inter({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
const manrope = Manrope({ subsets: ["latin"], display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
const openSans = Open_Sans({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
const workSans = Work_Sans({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
const raleway = Raleway({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
const lora = Lora({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
const oswald = Oswald({ subsets: ["latin"], display: "swap" });
const leagueSpartan = League_Spartan({ subsets: ["latin"], display: "swap" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });

// Non-variable fonts: `weight` is required by next/font/google (build
// error otherwise). Picked a light/regular/bold-ish spread where available
// so the Negrita toggle has a real bold weight to switch to, not just a
// browser-synthesized one.
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"], display: "swap" });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700", "900"], style: ["normal", "italic"], display: "swap" });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700", "900"], style: ["normal", "italic"], display: "swap" });
const merriweather = Merriweather({ subsets: ["latin"], weight: ["300", "400", "700", "900"], style: ["normal", "italic"], display: "swap" });
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], display: "swap" });
const cormorantGaramond = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"], display: "swap" });
const dmSerifDisplay = DM_Serif_Display({ subsets: ["latin"], weight: ["400"], style: ["normal", "italic"], display: "swap" });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: ["400"], display: "swap" });
const anton = Anton({ subsets: ["latin"], weight: ["400"], display: "swap" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: ["400"], display: "swap" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], style: ["normal", "italic"], display: "swap" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], display: "swap" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], style: ["normal", "italic"], display: "swap" });

export interface TextFontOption {
  /** Shown in the picker, and the value stored on DesignElement.fontFamily. */
  label: string;
  /** Resolved, loadable CSS font-family value (next/font's real/hashed stack) — never the raw label, which is not itself a valid font-family value for a self-hosted next/font instance. */
  css: string;
}

export interface TextFontCategory {
  name: string;
  fonts: TextFontOption[];
}

export const TEXT_FONT_CATEGORIES: TextFontCategory[] = [
  {
    name: "Sans Serif",
    fonts: [
      { label: "DM Sans", css: dmSans.style.fontFamily },
      { label: "Inter", css: inter.style.fontFamily },
      { label: "Manrope", css: manrope.style.fontFamily },
      { label: "Montserrat", css: montserrat.style.fontFamily },
      { label: "Poppins", css: poppins.style.fontFamily },
      { label: "Outfit", css: outfit.style.fontFamily },
      { label: "Plus Jakarta Sans", css: plusJakartaSans.style.fontFamily },
      { label: "Nunito Sans", css: nunitoSans.style.fontFamily },
      { label: "Roboto", css: roboto.style.fontFamily },
      { label: "Open Sans", css: openSans.style.fontFamily },
      { label: "Lato", css: lato.style.fontFamily },
      { label: "Work Sans", css: workSans.style.fontFamily },
      { label: "Raleway", css: raleway.style.fontFamily },
    ],
  },
  {
    name: "Serif",
    fonts: [
      { label: "Playfair Display", css: playfairDisplay.style.fontFamily },
      { label: "Lora", css: lora.style.fontFamily },
      { label: "Merriweather", css: merriweather.style.fontFamily },
      { label: "Libre Baskerville", css: libreBaskerville.style.fontFamily },
      { label: "Cormorant Garamond", css: cormorantGaramond.style.fontFamily },
      { label: "DM Serif Display", css: dmSerifDisplay.style.fontFamily },
    ],
  },
  {
    name: "Display",
    fonts: [
      { label: "Bebas Neue", css: bebasNeue.style.fontFamily },
      { label: "Oswald", css: oswald.style.fontFamily },
      { label: "Anton", css: anton.style.fontFamily },
      { label: "Archivo Black", css: archivoBlack.style.fontFamily },
      { label: "Barlow Condensed", css: barlowCondensed.style.fontFamily },
      { label: "League Spartan", css: leagueSpartan.style.fontFamily },
    ],
  },
  {
    name: "Mono / Técnicas",
    fonts: [
      { label: "Space Mono", css: spaceMono.style.fontFamily },
      { label: "IBM Plex Mono", css: ibmPlexMono.style.fontFamily },
      { label: "Roboto Mono", css: robotoMono.style.fontFamily },
    ],
  },
];

const TEXT_FONT_FAMILY_MAP: Record<string, string> = Object.fromEntries(
  TEXT_FONT_CATEGORIES.flatMap((c) => c.fonts.map((f) => [f.label, f.css]))
);

export const DEFAULT_TEXT_FONT_LABEL = "DM Sans";

/** DesignElement.fontFamily stores the *label* (e.g. "Playfair Display"),
 * never a raw CSS value — resolve through here wherever it's actually
 * rendered (canvas, preview, measurement). Passes through unrecognized
 * values as-is so any legacy-saved raw CSS family string still works. */
export function resolveFontFamilyCss(label: string | undefined): string {
  if (!label) return TEXT_FONT_FAMILY_MAP[DEFAULT_TEXT_FONT_LABEL];
  return TEXT_FONT_FAMILY_MAP[label] ?? label;
}