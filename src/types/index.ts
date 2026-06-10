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

export interface TechniquePrice {
  qty_min: number;
  qty_max: number | null;
  price_per_element: number;
}

export interface PrintTechnique {
  id: string;
  name: string;
  description: string | null;
  price_table: TechniquePrice[];
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

export interface CustomizationSnapshot {
  canvas_data_url: string;
  logos: CustomizationElement[];
  texts: CustomizationElement[];
  applied_to: "all" | "per_color";
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
