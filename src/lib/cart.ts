import type { CartItem } from "@/types";

const CART_KEY = "merchy_cart";

export function getGuestCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveGuestCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToGuestCart(item: CartItem): void {
  const cart = getGuestCart();
  cart.push(item);
  saveGuestCart(cart);
}

export function removeFromGuestCart(itemId: string): void {
  const cart = getGuestCart().filter((i) => i.id !== itemId);
  saveGuestCart(cart);
}

export function getGuestCartCount(): number {
  return getGuestCart().reduce((sum, i) => sum + i.total_quantity, 0);
}

export function clearGuestCart(): void {
  localStorage.removeItem(CART_KEY);
}
