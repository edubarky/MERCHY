// Destello del lado izquierdo de la tarjeta Experiencia ("Sombra 1" de Figma), como pieza
// independiente movible.
export default function ExperienciaGlowArt() {
  return (
      <svg width="100%" height="100%" viewBox="0 0 150 663" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g filter="url(#filter0_g_2108_6115)">
      <path fillRule="evenodd" clipRule="evenodd" d="M63.1588 582.909L0.00193408 583.035L-0.999858 79C-0.999858 79 44.7848 217.04 62.6194 311.533C80.4541 406.026 63.1588 582.909 63.1588 582.909Z" fill="url(#paint0_linear_2108_6115)" fillOpacity="0.4"/>
      </g>
      <defs>
      <filter id="filter0_g_2108_6115" x="-80" y="0" width="229.688" height="662.035" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.99900001287460327 0.99900001287460327" numOctaves="3" seed="3922" />
      <feDisplacementMap in="shape" scale="158" xChannelSelector="R" yChannelSelector="G" result="displacedImage" width="100%" height="100%" />
      <feMerge result="effect1_texture_2108_6115">
      <feMergeNode in="displacedImage"/>
      </feMerge>
      </filter>
      <linearGradient id="paint0_linear_2108_6115" x1="35.6905" y1="78.9271" x2="30.2109" y2="582.922" gradientUnits="userSpaceOnUse">
      <stop offset="0.135257" stopColor="#7FDED9"/>
      <stop offset="0.875" stopColor="#CCFFFB"/>
      </linearGradient>
      </defs>
      </svg>
      
  );
}
