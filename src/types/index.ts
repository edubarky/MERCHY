// ============================================================
// MERCHY — Shared TypeScript Types
// ============================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string;
  composition: string | null;
  sizes_available: string[];
  costo: number;
  supplier: string | null;
  supplier_link: string | null;
  active: boolean;
  created_at: string;
  category?: Category;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  color_name: string;
  color_hex: string;
  images: string[];
  stock: number;
  active: boolean;
}

export interface PriceTier {
  id: string;
  qty_min: number;
  qty_max: number | null;
  margin_pct: number;
  label: string;
}

// Cada técnica define su propio parámetro de precio (no hay una fórmula
// única para todas) — pricing_type dice cómo leer price_table:
//   "by_qty"    -> solo depende de la cantidad total (ej. DTG)
//   "by_tintas" -> depende del número de tintas Y la cantidad (Serigrafía, Tampografía)
//   "by_size"   -> depende del tamaño del logo Y la cantidad (DTF Textil, DTF UV)
//   null        -> sin suficiente información todavía -> "Precio por cotizar"
// tintas/size son opcionales en cada renglón porque solo aplican al tipo
// correspondiente -- un renglón "by_qty" nunca los trae.
export type PricingType = "by_qty" | "by_tintas" | "by_size" | null;

export interface TechniquePrice {
  qty_min: number;
  qty_max: number | null;
  price_per_element: number;
  tintas?: number;
  size?: string; // ej. "5x5", "10x10", "20x20" (cm)
}

export interface PrintTechnique {
  id: string;
  name: string;
  description: string | null;
  price_table: TechniquePrice[];
  pricing_type: PricingType;
  active: boolean;
  sort_order: number;
}

// ---- Cart ----

export interface SizesBreakdown {
  [size: string]: number; // e.g., { S: 2, M: 3, L: 1 }
}

export interface CartVariantSelection {
  variant_id: string;
  color_name: string;
  color_hex: string;
  qty: number;
  sizes_breakdown: SizesBreakdown;
}

export interface CustomizationElement {
  type: "logo" | "text";
  url?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

// Detalle completo de UNA técnica activa dentro de una selección múltiple
// (ver PersonalizerClient) -- guarda exactamente los parámetros que el
// cliente eligió (tintas, tamaño por logo) y el precio ya calculado, para
// que el pedido quede totalmente trazable sin tener que re-derivarlo
// después. needs_quote=true cuando esa técnica (o alguno de sus logos, en
// el caso "by_size") no tiene una tarifa configurada para lo elegido --
// nunca se inventa un precio en su lugar.
export interface SelectedTechniqueDetail {
  technique_id: string;
  technique_name: string;
  tintas?: number;
  logo_sizes?: Record<string, string>; // elementId -> "5x5" | "10x10" | "20x20" ya redondeado (solo pricing_type "by_size")
  // "positions" ya NO se escribe a mano -- son los ejes
  // (Frente/Reverso/Izquierda/Derecha, ver VIEW_LABELS) donde el cliente
  // realmente colocó algún LOGO en el canvas, derivado en vivo de
  // `elements`. Puramente informativo para producción, nunca multiplica
  // el precio.
  positions?: string[];
  // Medida en cm que el cliente escribió, por logo (elementId -> {largo,
  // alto}) -- ya no una sola compartida por técnica. Para pricing_type
  // "by_size" alimenta el redondeo a un tamaño configurado por logo (ver
  // roundUpToConfiguredSize/resolveLogoSize en PersonalizerClient), cuyo
  // resultado ya redondeado queda en `logo_sizes` arriba; para el resto de
  // técnicas (by_qty / null) es informativo igual que positions.
  size_cm?: Record<string, { largo: number; alto: number }>;
  unit_price: number | null; // null cuando needs_quote es true
  needs_quote: boolean;
}

export interface CustomizationSnapshot {
  canvas_data_url: string;
  logos: CustomizationElement[];
  texts: CustomizationElement[];
  applied_to: "all" | "per_color";
  // Nuevo, opcional: detalle multi-técnica. technique_id/technique en
  // CartItem se mantienen apuntando a la PRIMERA técnica seleccionada
  // (compatibilidad con el carrito/checkout existentes, que todavía
  // muestran una sola técnica) -- este arreglo es la fuente completa.
  selected_techniques?: SelectedTechniqueDetail[];
}

export interface CartItem {
  id: string;
  product: Product;
  variants: CartVariantSelection[];
  total_quantity: number;
  technique_id: string | null;
  technique?: PrintTechnique;
  num_elements: number;
  customization_snapshot: CustomizationSnapshot | null;
  unit_price: number;
  total_price: number;
}

// ---- Orders ----

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled";

export type ShippingType = "standard" | "express";

export type PaymentMethod = "card" | "paypal" | "mercadopago" | "transfer";

export interface ShippingAddress {
  calle: string;
  numero_ext: string;
  numero_int?: string;
  cp: string;
  municipio: string;
  estado: string;
  colonia: string;
  instrucciones?: string;
}

export interface BillingData {
  rfc: string;
  regimen_fiscal: string;
  nombre: string;
  apellidos: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  shipping_type: ShippingType;
  shipping_address: ShippingAddress;
  billing_data: BillingData | null;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  payment_status: string;
  discount_code: string | null;
  notes: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface DiscountCode {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_order: number;
  max_uses: number | null;
  current_uses: number;
  active: boolean;
  expires_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  variants: CartVariantSelection[];
  total_quantity: number;
  technique_id: string | null;
  technique_name: string | null;
  num_elements: number;
  customization_snapshot: CustomizationSnapshot | null;
  unit_price: number;
  total_price: number;
}

// ---- Admin entities ----

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  rfc: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface ProductionStatus {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  active: boolean;
}

export interface Quote {
  id: string;
  token: string;
  agent_id: string;
  client_id: string | null;
  items: CartItem[];
  notes: string | null;
  customer_email: string | null;
  status: "active" | "viewed" | "converted" | "expired";
  expires_at: string;
  created_at: string;
  client?: Client;
  agent?: Profile;
}

export interface Project {
  id: string;
  project_number: string;
  order_id: string | null;
  quote_id: string | null;
  agent_id: string | null;
  client_id: string | null;
  status_id: string | null;
  product_description: string | null;
  total_amount: number;
  notes: string | null;
  approved_at: string | null;
  scheduled_delivery_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
  agent?: Profile;
  status?: ProductionStatus;
}

// ---- Profile ----

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  rfc: string | null;
  regimen_fiscal: string | null;
  default_address: ShippingAddress | null;
  created_at: string;
  updated_at: string;
}

export interface SavedLogo {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  thumbnail_url: string | null;
  created_at: string;
}
