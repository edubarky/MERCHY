"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { CartItem } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { deleteSavedLogoByUrl } from "@/lib/artLibrary/ArtLibraryContext";

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
  // true una vez que ya se intentó leer el carrito de localStorage (en el
  // primer render `items` siempre arranca en [] así se haya guardado algo
  // antes) -- lo necesita quien busque un renglón concreto por id nada
  // más montar (ver "Editar" en el Personalizador, PersonalizerClient.tsx)
  // para no darlo por "no existe" antes de que termine de hidratar.
  hydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const supabaseRef = useRef(createClient());

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

  // Al quitar un renglón, se borran también los logos que ese diseño haya
  // subido -- pedido explícito (ver charla 2026-09-16): "no quiero que se
  // guarden TODOS los logos que un usuario llene en su vida", solo
  // mientras el diseño siga en el carrito. NUNCA se llama desde
  // clearCart() (ver ahí abajo) -- ese se dispara también después de un
  // checkout exitoso, donde el pedido YA guardó su propio
  // customization_snapshot apuntando a estos mismos archivos; borrarlos
  // ahí rompería la producción real del pedido.
  //
  // BUG real encontrado (ver charla 2026-09-17): al confirmar un diseño,
  // PersonalizerClient hace addItem(nuevo) + removeItem(draftCartItemId)
  // -- pero el draft y el renglón recién confirmado comparten LA MISMA
  // url de imagen (es el mismo archivo subido). Sin este chequeo, borrar
  // el draft borraba también el archivo que el renglón nuevo YA estaba
  // usando -- el logo desaparecía justo al confirmar. Ahora solo se borra
  // una url si NINGÚN otro renglón restante la sigue usando.
  function removeItem(id: string) {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      const remaining = prev.filter((i) => i.id !== id);
      const urls = item?.customization_snapshot?.logos.map((l) => l.url).filter((u): u is string => !!u) ?? [];
      const stillUsed = new Set(
        remaining.flatMap((i) => i.customization_snapshot?.logos.map((l) => l.url).filter((u): u is string => !!u) ?? [])
      );
      new Set(urls).forEach((url) => {
        if (!stillUsed.has(url)) deleteSavedLogoByUrl(supabaseRef.current, url);
      });
      return remaining;
    });
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = items.reduce((sum, i) => sum + i.total_quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
  const total = subtotal;

  return (
    <CartContext.Provider value={{ items, addItem, upsertItem, removeItem, clearCart, totalItems, subtotal, total, justAdded, hydrated }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

// Id fijo (no uid() aleatorio) para el renglón "en curso" de un producto --
// usado tanto por la ficha del producto (ProductDetail, en cuanto el
// cliente elige cantidad/color/talla) como por el Personalizador (en
// cuanto agrega algo de diseño), para que compartan el MISMO renglón en
// vez de mostrar dos filas duplicadas del mismo producto: el cliente elige
// su cantidad/color/talla en la ficha (se sincroniza aquí), entra a
// personalizar (el Personalizador sigue actualizando este mismo id), y al
// confirmar el diseño ese renglón se reemplaza por uno YA confirmado con
// su propio id nuevo (ver handleAddToCart en PersonalizerClient). Nunca
// choca con el id de un renglón confirmado, que siempre usa uid().
export function productDraftCartItemId(productId: string) {
  return `producto-en-progreso:${productId}`;
}