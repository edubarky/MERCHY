"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem } from "@/types";

const STORAGE_KEY = "merchy_cart_v1";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  upsertItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  total: number;
  justAdded: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage unavailable or corrupted payload — start from an empty cart
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full/unavailable — cart still works in-memory for this session
    }
  }, [items, hydrated]);

  function addItem(item: CartItem) {
    setItems((prev) => [...prev, item]);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 400);
  }

  // Reemplaza el renglón existente con ese mismo id, o lo agrega si no
  // había uno todavía -- usado por el Personalizador para mantener
  // sincronizado en el carrito el renglón "en curso" de un diseño que el
  // cliente sigue editando (ver PersonalizerClient's draftCartItemId), sin
  // duplicar un renglón nuevo cada vez que cambia algo. El pulso "recién
  // agregado" (justAdded) solo se dispara la primera vez que ese id
  // aparece -- una edición posterior del mismo renglón no debe repetir la
  // animación cada 400ms mientras el cliente sigue trabajando.
  function upsertItem(item: CartItem) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx === -1) {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 400);
        return [...prev, item];
      }
      const next = [...prev];
      next[idx] = item;
      return next;
    });
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = items.reduce((sum, i) => sum + i.total_quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
  const total = subtotal;

  return (
    <CartContext.Provider value={{ items, addItem, upsertItem, removeItem, clearCart, totalItems, subtotal, total, justAdded }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}