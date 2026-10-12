// print_techniques.name es la llave real usada por ICON_SRC, las tarjetas
// de PrintTechniqueCards y los snapshots guardados en pedidos viejos --
// nunca se toca. Este mapa solo cambia lo que se MUESTRA a un humano
// (admin o cliente). "Textil DTF" quedó así en la base de datos por cómo
// se dio de alta; tanto el admin como el Personalizador la nombran
// "DTF Textil" (ver charla 2026-10-12).
const TECHNIQUE_DISPLAY_NAME: Record<string, string> = {
  "Textil DTF": "DTF Textil",
};

export function techniqueDisplayName(name: string): string {
  return TECHNIQUE_DISPLAY_NAME[name] ?? name;
}
