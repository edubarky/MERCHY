// Fondo de la tarjeta Experiencia (rect + blobs de textura) recortado al area exacta de la tarjeta, desde public/Home/EXPERIENCIA/EXPERIENCIA.svg. El icono, titulo y parrafo se dividieron en componentes propios (IconArt/HeadingArt/ParagraphArt) para poder posicionarlos de forma independiente.
export default function ExperienciaCardArt() {
  return (
    <svg width="100%" height="100%" viewBox="80 79 722 507" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="80" y="79.0001" width="722" height="507" fill="#85D9D5"/>
      <g filter="url(#filter0_g_2029_5288)">
      <path fillRule="evenodd" clipRule="evenodd" d="M731.843 79.3773L794.999 79L798.01 583.027C798.01 583.027 751.676 445.171 733.465 350.75C715.253 256.328 731.843 79.3773 731.843 79.3773Z" fill="url(#paint0_linear_2029_5288)" fillOpacity="0.4"/>
      </g>
      <g filter="url(#filter1_g_2029_5288)">
      <path fillRule="evenodd" clipRule="evenodd" d="M143.159 586.051L80.0019 586.176L79.0001 82.1412C79.0001 82.1412 124.785 220.181 142.619 314.674C160.454 409.167 143.159 586.051 143.159 586.051Z" fill="url(#paint1_linear_2029_5288)" fillOpacity="0.4"/>
      </g>
      <defs>
      <filter id="filter0_g_2029_5288" x="645.928" y="0" width="231.083" height="662.027" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.99900001287460327 0.99900001287460327" numOctaves="3" seed="3922" />
      <feDisplacementMap in="shape" scale="158" xChannelSelector="R" yChannelSelector="G" result="displacedImage" width="100%" height="100%" />
      <feMerge result="effect1_texture_2029_5288">
      <feMergeNode in="displacedImage"/>
      </feMerge>
      </filter>
      <filter id="filter1_g_2029_5288" x="0" y="3.1412" width="229.688" height="662.035" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.99900001287460327 0.99900001287460327" numOctaves="3" seed="3922" />
      <feDisplacementMap in="shape" scale="158" xChannelSelector="R" yChannelSelector="G" result="displacedImage" width="100%" height="100%" />
      <feMerge result="effect1_texture_2029_5288">
      <feMergeNode in="displacedImage"/>
      </feMerge>
      </filter>
      <linearGradient id="paint0_linear_2029_5288" x1="761.321" y1="583.246" x2="764.791" y2="79.2333" gradientUnits="userSpaceOnUse">
      <stop offset="0.135257" stopColor="#7FDED9"/>
      <stop offset="0.875" stopColor="#CCFFFB"/>
      </linearGradient>
      <linearGradient id="paint1_linear_2029_5288" x1="115.69" y1="82.0683" x2="110.211" y2="586.063" gradientUnits="userSpaceOnUse">
      <stop offset="0.135257" stopColor="#7FDED9"/>
      <stop offset="0.875" stopColor="#CCFFFB"/>
      </linearGradient>
      </defs>
    </svg>
  );
}
