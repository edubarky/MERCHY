// Tamaño del primer lote que trae el servidor (page.tsx) Y de cada lote
// que suma "Cargar más" (CatalogGridWithFilters) -- una sola constante
// compartida para que ambos coincidan. Vive en su propio archivo (no en
// page.tsx) para no arrastrar imports de servidor (@/lib/supabase/server)
// al bundle del componente cliente.
export const PAGE_SIZE = 12;
