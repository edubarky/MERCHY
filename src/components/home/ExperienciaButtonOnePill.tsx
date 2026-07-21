// Fondo (pill blanco + resplandor) del Botón 1 de Figma, sin el texto, para poder animar el texto por separado.
export default function ExperienciaButtonOnePill() {
  return (
      <svg width="100%" height="100%" viewBox="0 0 275 76" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g filter="url(#filter0_d_2178_6674)">
      <rect x="4" y="2" width="267" height="68" rx="34" fill="white" fillOpacity="0.2" shapeRendering="crispEdges"/>
      </g>
      <rect x="9" y="8" width="256" height="56" rx="28" fill="white"/>
      <defs>
      <filter id="filter0_d_2178_6674" x="0" y="0" width="275" height="76" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="2"/>
      <feGaussianBlur stdDeviation="2"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.921569 0 0 0 0 0.933333 0 0 0 0 0.945098 0 0 0 1 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_2178_6674"/>
      <feBlend mode="normal" in="BackgroundImageFix" in2="effect1_dropShadow_2178_6674" result="BackgroundImageFix"/>
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
      </filter>
      </defs>
      </svg>
      
  );
}
