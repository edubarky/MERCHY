// Formato de dinero compartido — antes repetido como Number(n).toLocaleString("es-MX") suelto en cada archivo del admin.
export function money(n: number) {
  return Number(n).toLocaleString("es-MX");
}
