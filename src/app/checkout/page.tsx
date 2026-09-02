"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import { useCart } from "@/lib/cart/CartContext";
import { createClient } from "@/lib/supabase/client";
import { formatMXN } from "@/lib/pricing";
import type { BillingData, DiscountCode, PaymentMethod, ShippingAddress, ShippingType } from "@/types";

// ---- Costos de envío fijos -- mismo valor por defecto que ya trae
// orders.shipping_cost en el schema (80.00) para "standard"; "express" es
// el único otro tramo que pide el diseño. Si algún día se vuelven
// configurables desde el admin, esto se reemplaza por una tabla, igual que
// price_tiers -- por ahora, dos tramos fijos alcanzan. ----
const SHIPPING_COSTS: Record<ShippingType, number> = { standard: 80, express: 150 };
const SHIPPING_LABELS: Record<ShippingType, { label: string; eta: string }> = {
  standard: { label: "Envío estándar", eta: "3-5 días" },
  express: { label: "Envío express", eta: "1-2 días" },
};

// ---- Catálogo de Régimen Fiscal (SAT, vigente para CFDI 4.0) -- estable,
// cambia muy rara vez, así que se deja fijo aquí en vez de una tabla nueva
// (mismo criterio que SHIPPING_COSTS arriba). Solo se usa si el cliente
// decide llenar Facturación -- ver `billingTouched` más abajo. ----
const REGIMENES_FISCALES = [
  { code: "601", label: "601 · General de Ley Personas Morales" },
  { code: "603", label: "603 · Personas Morales con Fines no Lucrativos" },
  { code: "605", label: "605 · Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { code: "606", label: "606 · Arrendamiento" },
  { code: "607", label: "607 · Régimen de Enajenación o Adquisición de Bienes" },
  { code: "608", label: "608 · Demás ingresos" },
  { code: "610", label: "610 · Residentes en el Extranjero sin Establecimiento Permanente en México" },
  { code: "611", label: "611 · Ingresos por Dividendos (socios y accionistas)" },
  { code: "612", label: "612 · Personas Físicas con Actividades Empresariales y Profesionales" },
  { code: "614", label: "614 · Ingresos por intereses" },
  { code: "615", label: "615 · Régimen de los ingresos por obtención de premios" },
  { code: "616", label: "616 · Sin obligaciones fiscales" },
  { code: "620", label: "620 · Sociedades Cooperativas de Producción que optan por diferir sus ingresos" },
  { code: "621", label: "621 · Incorporación Fiscal" },
  { code: "622", label: "622 · Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
  { code: "623", label: "623 · Opcional para Grupos de Sociedades" },
  { code: "624", label: "624 · Coordinados" },
  { code: "625", label: "625 · Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
  { code: "626", label: "626 · Régimen Simplificado de Confianza" },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "card", label: "Tarjeta de crédito/débito" },
  { id: "paypal", label: "PayPal" },
  { id: "mercadopago", label: "Mercado Pago" },
  { id: "transfer", label: "Transferencia" },
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string) {
  return value.replace(/\D/g, "").length >= 10;
}

function isValidRfc(value: string) {
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(value.trim().toUpperCase());
}

function generateOrderNumber() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MRC-${y}${m}${d}-${rand}`;
}

// ---- Piezas de UI reutilizadas por todo el formulario -- mismo lenguaje
// visual (píldoras, bg-gray-50, ui-border) que ya usan ProductDetail y el
// Personalizador en el resto del sitio. ----
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[20px] bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)] sm:p-7">{children}</div>;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-ui-gray">{subtitle}</p>}
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold text-ui-gray">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-full border border-ui-border bg-gray-50 px-4 py-3 text-sm text-foreground outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:text-ui-gray disabled:opacity-70";

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${inputClass} appearance-none pr-10 ${props.className ?? ""}`}
      >
        {props.children}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-gray"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 7.5 5 5 5-5" />
      </svg>
    </div>
  );
}

function LocationIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 18s6-5.2 6-9.8A6 6 0 0 0 4 8.2C4 12.8 10 18 10 18Z" />
      <circle cx="10" cy="8.2" r="2.1" />
    </svg>
  );
}

function TagIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3H4v7l9 9 7-7-9-9Z" />
      <circle cx="7.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d="m7.5 12.5 3 3 6-6.5" />
    </svg>
  );
}

interface CpLookup {
  estado: string;
  municipio: string;
  colonias: string[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [address, setAddress] = useState<ShippingAddress>({
    calle: "",
    numero_ext: "",
    numero_int: "",
    cp: "",
    municipio: "",
    estado: "",
    colonia: "",
    instrucciones: "",
  });
  const [cpLookup, setCpLookup] = useState<CpLookup | null>(null);
  const [cpStatus, setCpStatus] = useState<"idle" | "loading" | "notfound">("idle");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [shippingType, setShippingType] = useState<ShippingType>("standard");

  // Facturación es opcional -- billing_data solo se manda si el cliente
  // realmente empezó a llenar esta sección (ver `billingTouched` más
  // abajo), nunca un objeto con puros campos vacíos.
  const [rfc, setRfc] = useState("");
  const [regimenFiscal, setRegimenFiscal] = useState("");
  const [billingNombre, setBillingNombre] = useState("");
  const [billingApellido1, setBillingApellido1] = useState("");
  const [billingApellido2, setBillingApellido2] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discountChecking, setDiscountChecking] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<{ orderNumber: string; total: number } | null>(null);

  const supabaseRef = useRef(createClient());
  const cpDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirige al carrito si llegan aquí sin nada que pagar -- nunca antes
  // de que el carrito termine de hidratarse desde localStorage (items
  // arranca vacío en el primer render de CartProvider a propósito), por
  // eso el guardado viene con un pequeño retraso en vez de ser instantáneo.
  useEffect(() => {
    if (confirmedOrder) return;
    const t = setTimeout(() => {
      if (items.length === 0) router.replace("/carrito");
    }, 300);
    return () => clearTimeout(t);
  }, [items.length, confirmedOrder, router]);

  // Resuelve el CP escrito -- debounced, vía @webrek/mx-cp (SEPOMEX, vive
  // en el propio paquete, sin API key ni red). Un CP inválido/no
  // encontrado limpia Estado/Municipio/Colonia en vez de dejar el último
  // resultado viejo puesto.
  useEffect(() => {
    if (cpDebounceRef.current) clearTimeout(cpDebounceRef.current);
    const cp = address.cp.trim();
    if (cp.length !== 5) {
      setCpLookup(null);
      setCpStatus("idle");
      return;
    }
    setCpStatus("loading");
    cpDebounceRef.current = setTimeout(async () => {
      try {
        const { buscaCP } = await import("@webrek/mx-cp");
        const r = await buscaCP(cp);
        if (!r) {
          setCpLookup(null);
          setCpStatus("notfound");
          return;
        }
        const colonias = r.asentamientos.map((a) => a.nombre);
        setCpLookup({ estado: r.estado, municipio: r.municipio, colonias });
        setCpStatus("idle");
        setAddress((prev) => ({
          ...prev,
          estado: r.estado,
          municipio: r.municipio,
          // Conserva la colonia ya elegida si sigue siendo válida para
          // este CP (ej. el cliente corrigió un dígito y el CP resultante
          // comparte esa misma colonia); si no, deja que elija de nuevo.
          colonia: colonias.includes(prev.colonia) ? prev.colonia : colonias[0] ?? "",
        }));
      } catch {
        setCpLookup(null);
        setCpStatus("notfound");
      }
    }, 350);
    return () => {
      if (cpDebounceRef.current) clearTimeout(cpDebounceRef.current);
    };
  }, [address.cp]);

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          if (!res.ok) throw new Error("geocode failed");
          const data = await res.json();
          setAddress((prev) => ({
            ...prev,
            calle: data.calle || prev.calle,
            numero_ext: data.numero_ext || prev.numero_ext,
            cp: data.cp || prev.cp,
            // La colonia que devuelve Nominatim casi nunca coincide letra
            // por letra con el nombre oficial de SEPOMEX -- se guarda
            // aparte y solo se usa como intento de preselección una vez
            // que el CP resuelto traiga sus opciones reales (ver el efecto
            // de más abajo), nunca se escribe directo aquí.
          }));
          setGeoGuessColonia(data.colonia || null);
        } catch {
          setGeoError("No se pudo obtener tu dirección. Intenta escribirla manualmente.");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoError("No pudimos acceder a tu ubicación. Revisa los permisos del navegador.");
        setGeoLoading(false);
      },
      { timeout: 10000 }
    );
  }

  const [geoGuessColonia, setGeoGuessColonia] = useState<string | null>(null);
  // Una vez que el CP (llenado por geolocalización) resuelve sus colonias
  // reales, intenta emparejar el nombre que dio Nominatim contra esa lista
  // (sin acentos/mayúsculas) -- si hay coincidencia, la preselecciona; si
  // no, el cliente elige a mano del dropdown, nunca se inventa una.
  useEffect(() => {
    if (!geoGuessColonia || !cpLookup) return;
    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    const guess = normalize(geoGuessColonia);
    const match = cpLookup.colonias.find((c) => normalize(c) === guess || normalize(c).includes(guess) || guess.includes(normalize(c)));
    if (match) setAddress((prev) => ({ ...prev, colonia: match }));
    setGeoGuessColonia(null);
  }, [geoGuessColonia, cpLookup]);

  const billingTouched = rfc.trim() !== "" || billingNombre.trim() !== "" || billingApellido1.trim() !== "" || regimenFiscal.trim() !== "";

  const shippingCost = SHIPPING_COSTS[shippingType];
  const discountAmount = useMemo(() => {
    if (!appliedDiscount) return 0;
    if (subtotal < appliedDiscount.min_order) return 0;
    return appliedDiscount.type === "percentage"
      ? Math.round(subtotal * (appliedDiscount.value / 100) * 100) / 100
      : Math.min(appliedDiscount.value, subtotal);
  }, [appliedDiscount, subtotal]);
  const total = Math.max(0, subtotal - discountAmount) + shippingCost;
  const totalQuantity = items.reduce((sum, i) => sum + i.total_quantity, 0);

  async function handleApplyDiscount() {
    const code = discountInput.trim().toUpperCase();
    if (!code) return;
    setDiscountChecking(true);
    setDiscountError(null);
    try {
      const { data, error } = await supabaseRef.current
        .from("discount_codes")
        .select("*")
        .ilike("code", code)
        .eq("active", true)
        .maybeSingle();
      if (error || !data) {
        setDiscountError("Ese código no existe o ya no está disponible.");
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setDiscountError("Ese código ya venció.");
        return;
      }
      if (data.max_uses !== null && data.current_uses >= data.max_uses) {
        setDiscountError("Ese código ya alcanzó su límite de usos.");
        return;
      }
      if (subtotal < data.min_order) {
        setDiscountError(`Este código aplica a partir de ${formatMXN(data.min_order)} MXN de compra.`);
        return;
      }
      setAppliedDiscount(data as DiscountCode);
    } catch {
      setDiscountError("No se pudo validar el código. Intenta de nuevo.");
    } finally {
      setDiscountChecking(false);
    }
  }

  function removeDiscount() {
    setAppliedDiscount(null);
    setDiscountInput("");
    setDiscountError(null);
  }

  function validate(): string | null {
    if (items.length === 0) return "Tu carrito está vacío.";
    if (!contactName.trim()) return "Falta tu nombre.";
    if (!isValidPhone(contactPhone)) return "El teléfono debe tener al menos 10 dígitos.";
    if (!isValidEmail(contactEmail)) return "El e-mail no es válido.";
    if (!address.calle.trim()) return "Falta la calle.";
    if (!address.numero_ext.trim()) return "Falta el número exterior.";
    if (!/^\d{5}$/.test(address.cp.trim())) return "El código postal debe tener 5 dígitos.";
    if (!cpLookup) return "No pudimos validar ese código postal.";
    if (!address.colonia.trim()) return "Falta la colonia.";
    if (billingTouched) {
      if (!isValidRfc(rfc)) return "El RFC no es válido.";
      if (!regimenFiscal) return "Falta el régimen fiscal.";
      if (!billingNombre.trim() || !billingApellido1.trim()) return "Faltan tus datos de facturación.";
    }
    return null;
  }

  async function handleSubmit() {
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const supabase = supabaseRef.current;
      const { data: userData } = await supabase.auth.getUser();

      const billingData: BillingData | null = billingTouched
        ? { rfc: rfc.trim().toUpperCase(), regimen_fiscal: regimenFiscal, nombre: billingNombre.trim(), apellidos: [billingApellido1.trim(), billingApellido2.trim()].filter(Boolean).join(" ") }
        : null;

      const orderNumber = generateOrderNumber();
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: userData.user?.id ?? null,
          status: "pending",
          subtotal,
          shipping_cost: shippingCost,
          discount: discountAmount,
          total,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim(),
          shipping_type: shippingType,
          shipping_address: address,
          billing_data: billingData,
          payment_method: paymentMethod,
          payment_status: "pending",
          discount_code: appliedDiscount?.code ?? null,
        })
        .select()
        .single();

      if (orderError || !order) {
        setFormError("No se pudo crear el pedido. Intenta de nuevo en un momento.");
        return;
      }

      const orderItemsPayload = items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_sku: item.product.sku,
        variants: item.variants,
        total_quantity: item.total_quantity,
        technique_id: item.technique_id,
        technique_name: item.technique?.name ?? null,
        num_elements: item.num_elements,
        customization_snapshot: item.customization_snapshot,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
      if (itemsError) {
        setFormError("El pedido se creó, pero hubo un problema guardando los productos. Contáctanos con tu número de pedido: " + orderNumber);
        return;
      }

      clearCart();
      setConfirmedOrder({ orderNumber, total });
    } catch {
      setFormError("No se pudo crear el pedido. Intenta de nuevo en un momento.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedOrder) {
    return (
      <main className="min-h-screen bg-background">
        <PublicHeader />
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary-dark">
            <CheckCircleIcon className="h-9 w-9" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">¡Pedido recibido!</h1>
          <p className="mt-2 text-sm text-ui-gray">
            Tu número de pedido es <span className="font-semibold text-foreground">{confirmedOrder.orderNumber}</span>. Te contactaremos para
            confirmar el pago y arrancar la producción.
          </p>
          <p className="mt-4 text-lg font-bold text-foreground">{formatMXN(confirmedOrder.total)} MXN</p>
          <Link
            href="/catalogo"
            className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-primary px-7 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:-translate-y-0.5"
          >
            Seguir comprando
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-foreground sm:text-3xl">Finalizar compra</h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-6">
            {/* Datos de contacto */}
            <Card>
              <SectionHeader title="Datos de contacto" subtitle="Te contactaremos si surge algún problema con tu entrega" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nombre">
                  <TextInput value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Tu nombre completo" />
                </Field>
                <Field label="Teléfono">
                  <TextInput
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+52 55 1234 5678"
                    inputMode="tel"
                  />
                </Field>
                <Field label="E-mail" className="sm:col-span-2">
                  <TextInput
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="tu@email.com"
                  />
                </Field>
              </div>
            </Card>

            {/* Dirección de envío */}
            <Card>
              <SectionHeader title="Dirección de envío" />
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={geoLoading}
                className="mb-5 flex items-center gap-2 rounded-full border border-ui-border bg-gray-50 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary disabled:opacity-60"
              >
                <LocationIcon className="h-4 w-4 text-primary-dark" />
                {geoLoading ? "Buscando tu ubicación..." : "Usar ubicación actual"}
              </button>
              {geoError && <p className="mb-4 -mt-3 text-xs text-accent-coral">{geoError}</p>}

              <div className="grid grid-cols-1 gap-4">
                <Field label="Dirección">
                  <TextInput value={address.calle} onChange={(e) => setAddress((p) => ({ ...p, calle: e.target.value }))} placeholder="Calle" />
                </Field>

                <Field label="Código postal">
                  <TextInput
                    value={address.cp}
                    onChange={(e) => setAddress((p) => ({ ...p, cp: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
                    placeholder="00000"
                    inputMode="numeric"
                  />
                  {cpStatus === "notfound" && address.cp.length === 5 && (
                    <span className="text-xs text-accent-coral">No encontramos ese código postal.</span>
                  )}
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Número interior">
                    <TextInput
                      value={address.numero_int}
                      onChange={(e) => setAddress((p) => ({ ...p, numero_int: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </Field>
                  <Field label="Número exterior">
                    <TextInput value={address.numero_ext} onChange={(e) => setAddress((p) => ({ ...p, numero_ext: e.target.value }))} />
                  </Field>
                  <Field label="Estado">
                    <TextInput value={address.estado} disabled placeholder={cpStatus === "loading" ? "Buscando..." : "Se llena con el CP"} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Municipio o alcaldía">
                    <TextInput value={address.municipio} disabled placeholder={cpStatus === "loading" ? "Buscando..." : "Se llena con el CP"} />
                  </Field>
                  <Field label="Colonia">
                    <SelectInput
                      value={address.colonia}
                      onChange={(e) => setAddress((p) => ({ ...p, colonia: e.target.value }))}
                      disabled={!cpLookup}
                    >
                      {!cpLookup && <option value="">Escribe tu CP primero</option>}
                      {cpLookup?.colonias.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>

                <Field label="Instrucciones de entrega (opcional)">
                  <TextInput
                    value={address.instrucciones}
                    onChange={(e) => setAddress((p) => ({ ...p, instrucciones: e.target.value }))}
                    placeholder="Ej. tocar el timbre, dejar con el conserje..."
                  />
                </Field>
              </div>
            </Card>

            {/* Método de envío */}
            <Card>
              <SectionHeader title="Método de envío" />
              <div className="space-y-3">
                {(Object.keys(SHIPPING_LABELS) as ShippingType[]).map((key) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border px-5 py-4 transition-colors ${
                      shippingType === key ? "border-primary bg-primary/5" : "border-ui-border hover:border-primary/40"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingType === key}
                        onChange={() => setShippingType(key)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm font-semibold text-foreground">
                        {SHIPPING_LABELS[key].label} <span className="font-normal text-ui-gray">({SHIPPING_LABELS[key].eta})</span>
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-foreground">{formatMXN(SHIPPING_COSTS[key])}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Facturación */}
            <Card>
              <SectionHeader title="Facturación" subtitle="Ingresa tus datos para generar tu factura con RFC (opcional)" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="RFC">
                  <TextInput
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase().slice(0, 13))}
                    placeholder="XAXX010101000"
                    maxLength={13}
                  />
                  <span className="text-right text-[11px] text-ui-gray">{rfc.length} / 13</span>
                </Field>
                <Field label="Régimen fiscal">
                  <SelectInput value={regimenFiscal} onChange={(e) => setRegimenFiscal(e.target.value)}>
                    <option value="">Selecciona uno</option>
                    {REGIMENES_FISCALES.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Nombre (s)">
                  <TextInput value={billingNombre} onChange={(e) => setBillingNombre(e.target.value)} />
                </Field>
                <Field label="Primer apellido">
                  <TextInput value={billingApellido1} onChange={(e) => setBillingApellido1(e.target.value)} />
                </Field>
                <Field label="Segundo apellido">
                  <TextInput value={billingApellido2} onChange={(e) => setBillingApellido2(e.target.value)} />
                </Field>
              </div>
            </Card>

            {/* Métodos de pago */}
            <Card>
              <SectionHeader title="Métodos de pago" />
              <div className="space-y-1">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                      paymentMethod === m.id ? "bg-primary/5" : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === m.id}
                      onChange={() => setPaymentMethod(m.id)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-medium text-foreground">{m.label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-4 text-xs text-ui-gray">
                Tu pedido se registra como pendiente de pago -- te contactaremos para confirmar el cobro con el método elegido.
              </p>
            </Card>
          </div>

          {/* ── Resumen (derecha, sticky) ── */}
          <div className="lg:sticky lg:top-8">
            <Card>
              <p className="mb-4 text-base font-bold text-foreground">Detalles de tu pedido</p>
              <div className="max-h-[340px] space-y-4 overflow-y-auto pr-1">
                {items.map((item) => {
                  const thumb = item.customization_snapshot?.canvas_data_url || item.product.variants?.[0]?.images?.[0];
                  const colors = item.variants.map((v) => v.color_name).join(", ");
                  const sizesMap: Record<string, number> = {};
                  item.variants.forEach((v) => {
                    Object.entries(v.sizes_breakdown).forEach(([size, qty]) => {
                      sizesMap[size] = (sizesMap[size] ?? 0) + qty;
                    });
                  });
                  const sizesLabel = Object.entries(sizesMap)
                    .filter(([, qty]) => qty > 0)
                    .map(([size, qty]) => `${size} (${qty})`)
                    .join(" ");
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt={item.product.name} className="h-full w-full object-contain" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="truncate font-semibold uppercase text-foreground">{item.product.name}</p>
                        <p className="text-ui-gray">Cantidad: {item.total_quantity}</p>
                        {colors && <p className="truncate text-ui-gray">Color: {colors}</p>}
                        {sizesLabel && <p className="truncate text-ui-gray">Tallas: {sizesLabel}</p>}
                        <p className="text-ui-gray">Tipo de impresión: {item.technique?.name ?? "Sin personalizar"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="my-5 h-px bg-ui-border" />

              <p className="mb-3 text-base font-bold text-foreground">Resumen</p>
              <div className="space-y-2 text-sm text-ui-gray">
                <div className="flex justify-between">
                  <span>Productos ({totalQuantity})</span>
                  <span>{formatMXN(subtotal)} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío ({SHIPPING_LABELS[shippingType].label})</span>
                  <span>{formatMXN(shippingCost)} MXN</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-primary-dark">
                    <span>Descuento ({appliedDiscount.code})</span>
                    <span>-{formatMXN(discountAmount)} MXN</span>
                  </div>
                )}
              </div>

              <div className="mt-4">
                {!discountOpen && !appliedDiscount && (
                  <button
                    type="button"
                    onClick={() => setDiscountOpen(true)}
                    className="flex items-center gap-1.5 rounded-full bg-accent-coral/10 px-3 py-1.5 text-xs font-semibold text-accent-coral"
                  >
                    <TagIcon className="h-3.5 w-3.5" />
                    Código de descuento
                  </button>
                )}
                {discountOpen && !appliedDiscount && (
                  <div className="flex gap-2">
                    <input
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="Código"
                      className="w-full rounded-full border border-ui-border bg-gray-50 px-4 py-2 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      disabled={discountChecking || !discountInput.trim()}
                      className="shrink-0 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {discountChecking ? "..." : "Aplicar"}
                    </button>
                  </div>
                )}
                {appliedDiscount && (
                  <div className="flex items-center justify-between rounded-full bg-primary/10 px-4 py-2">
                    <span className="text-xs font-semibold text-primary-dark">{appliedDiscount.code} aplicado</span>
                    <button type="button" onClick={removeDiscount} className="text-xs text-ui-gray hover:text-accent-coral">
                      Quitar
                    </button>
                  </div>
                )}
                {discountError && <p className="mt-1.5 text-xs text-accent-coral">{discountError}</p>}
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl bg-primary/10 px-5 py-4">
                <div>
                  <span className="font-bold text-foreground">Total</span>
                  <p className="text-[11px] text-ui-gray">IVA incluido</p>
                </div>
                <span className="text-xl font-bold text-foreground">{formatMXN(total)} MXN</span>
              </div>

              {formError && <p className="mt-4 text-sm font-medium text-accent-coral">{formError}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || items.length === 0}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-white transition-all duration-180 ease-out hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_8px_20px_rgba(87,224,217,0.4)] disabled:opacity-60"
              >
                {submitting ? "Enviando pedido..." : "Finalizar"}
              </button>
              <Link
                href="/carrito"
                className="mt-3 flex h-12 w-full items-center justify-center rounded-full border-2 border-foreground text-sm font-semibold text-foreground transition-all duration-180 ease-out hover:-translate-y-0.5"
              >
                Volver al carrito
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
