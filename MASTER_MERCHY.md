# MERCHY — Master Context

## Qué es
E-commerce de productos promocionales personalizados de alta calidad para el mercado mexicano.
Respaldado por ONE PRINT (taller de impresión propio) → entregas rápidas y control total de producción.

## Propuesta de valor
- Compra desde 1 pieza
- Personalización online sencilla (logo + texto sobre el producto)
- Cotización instantánea por técnica de impresión y volumen
- Diferenciador frente a competidores: flujo de compra rápido y claro

## Páginas / Flujo de usuario

### 1. Home
- Hero + CTA "Ver catálogo"
- Categorías visuales (Bebidas, Textiles, Deportivo, Todas)
- Favoritos del momento (carrusel)
- Sección "Destaca tu diseño / Lo que ofrecemos"
- Contacto + Footer

### 2. Catálogo (vista general)
- Grid de productos con filtros por categoría
- Tarjeta: imagen, nombre, colores disponibles, precio desde X MXN, badge "Mejor precio por cantidad"
- Paginación (12 por página)
- Barra de búsqueda + filtro lateral

### 3. Vista de producto (pasos 1 y 2)
- **Paso 1 — Seleccionar Color**
  - Swatches de colores disponibles
  - Toggle "Multicolor": permite seleccionar múltiples colores; el precio por pieza se calcula sobre el total de piezas combinadas
- **Paso 2 — Seleccionar Cantidad**
  - Selector numérico
  - Si hay tallas (textiles): distribución por talla por color (XS/S/M/L/XL)
  - Precio total y precio por pieza (IVA incluido) actualizados en tiempo real
- Botones: **Personalizar producto** → va al personalizador | **Agregar al carrito** → sin personalización

### 4. Personalizador (pasos 3 y 4)
- Tabs de vistas: Frente / Reverso / Izquierda / Derecha
- Canvas con preview del producto (imagen base + overlay del diseño)
- **Paso 3 — Agrega tu logo/texto**
  - "+ Logo": upload de archivo (PNG, JPG, PDF, AI, PSD, SVG); se coloca en canvas, draggable/resizable
  - "+ Texto": módulo tipo PowerPoint (fuente, tamaño, color, negrita/itálica/subrayado)
  - Si Multicolor: se puede navegar entre colores para personalizar cada uno por separado
- **Paso 4 — Tipo de impresión**
  - Opciones: DTF Textil, DTG, Serigrafía, Bordado (más técnicas configurables desde backend)
  - Precio cambia según técnica × cantidad × número de logos/textos
  - Footer fijo: Total MXN (IVA incluido) | Precio por pieza | # logos + textos
- Botones: Atrás / Siguiente (o "Finalizar personalización")

### 5. Personalizador Multicolor
- Cuando hay más de un color seleccionado, "Siguiente" avanza al mismo personalizador con el siguiente color
- Cada color puede tener su propio diseño en canvas, o copiarlo del anterior

### 6. Checkout
- **Resumen del pedido** (right panel): imagen, nombre, cantidad, colores, tallas, tipo de impresión, total
- **Datos de contacto**: nombre, teléfono, email
- **Dirección de envío**: usar ubicación actual | manual (calle, CP, #interior/#exterior, estado, municipio, colonia, instrucciones)
- Opciones: Envío estándar 3-5 días $80 | Envío express 1-2 días $150
- **Facturación**: RFC, régimen fiscal, nombre, apellidos (opcional)
- **Métodos de pago**: Tarjeta crédito/débito, PayPal, Mercado Pago, Transferencia
- Código de descuento
- Botón "Finalizar"

## Reglas de precios
- Precio por pieza varía por: **cantidad total** (volumen) × **técnica de impresión** × **número de elementos (logos/textos)**
- Las tablas de precios por técnica se configuran en el backend (admin)
- IVA siempre incluido en los precios mostrados al cliente
- Multicolor: precio/pza se calcula sobre el total de piezas de todos los colores combinados

## Identidad visual
- **Marca**: Merchy
- **Colores primarios**: Teal/Cyan (#00C9B8 aprox), Negro, Blanco, Gris claro
- **Assets**: en Google Drive → https://drive.google.com/drive/folders/1ydHOtvmsV2Z_cq4KPr2vzv2t799aMs0Z
- **Estilo**: limpio, moderno, accesible; botones redondeados pill-shape; tipografía sans-serif

## Stack técnico (decidido)
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel
- **Canvas/Personalizador**: Fabric.js
- **Pagos**: Mercado Pago (principal, mercado MX) + Stripe (tarjetas internacionales)
- **Uploads**: Supabase Storage (logos del cliente), con conversión a web-friendly en upload

## Schema de BD (borrador)
- `products`: id, sku, name, description, category_id, composition, sizes_available, active
- `product_variants`: id, product_id, color_name, color_hex, images[], stock
- `categories`: id, name, slug, icon
- `print_techniques`: id, name, description, price_table (JSONB: {qty_min, qty_max, price_per_logo})
- `product_prices`: id, product_id, qty_min, qty_max, unit_price
- `users`: (Supabase Auth) + tabla `profiles` con datos adicionales
- `orders`: id, user_id, status, subtotal, shipping, total, shipping_address, billing_data, payment_method
- `order_items`: id, order_id, product_id, variant_id, quantity, sizes_breakdown, customization_snapshot, technique_id, unit_price
- `customizations`: id, canvas_json, logos[], texts[], technique_id

## Estado del proyecto
- Figma completado (wireframes compartidos en Drive)
- Repo creado: https://github.com/edubarky/MERCHY
- Pendiente: setup inicial Next.js + Supabase
