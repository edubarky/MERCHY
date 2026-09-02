import { NextRequest, NextResponse } from "next/server";

// Proxy server-side a Nominatim (OpenStreetMap) para "Usar ubicación actual"
// en el checkout -- Nominatim no manda cabeceras CORS, así que un fetch
// directo desde el navegador queda bloqueado; este endpoint lo llama del
// lado del servidor (sin restricción CORS ahí) y solo reenvía lo que el
// checkout necesita. User-Agent identificable es requisito de su política
// de uso (https://operations.osmfoundation.org/policies/nominatim/) --
// nunca se omite. countrycodes=mx: Merchy solo envía dentro de México, no
// tiene sentido resolver direcciones de otros países.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ error: "Faltan lat/lon" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1&countrycodes=mx`,
      { headers: { "User-Agent": "Merchy-Checkout/1.0 (https://www.merchy.mx)" } }
    );
    if (!res.ok) return NextResponse.json({ error: "No se pudo geolocalizar" }, { status: 502 });
    const data = await res.json();
    const address = data?.address ?? {};
    // Solo los campos que el formulario de dirección realmente usa --
    // nunca se reenvía la respuesta completa de Nominatim (trae mucho más
    // de lo necesario: bounding box, osm_id, licencia, etc.).
    return NextResponse.json({
      calle: address.road ?? "",
      numero_ext: address.house_number ?? "",
      cp: address.postcode ?? "",
      colonia: address.neighbourhood ?? address.suburb ?? address.quarter ?? "",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo geolocalizar" }, { status: 502 });
  }
}
