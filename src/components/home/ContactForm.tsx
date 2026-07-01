"use client";

import { useState } from "react";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // Placeholder — connect to your email/CRM later
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="bg-primary/10 rounded-card p-10 flex flex-col items-center justify-center text-center gap-4 min-h-[300px]">
        <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="font-display font-bold text-xl text-foreground">¡Mensaje enviado!</h3>
        <p className="text-sm text-ui-gray">Te responderemos lo antes posible.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: "nombre", label: "Nombre", icon: "👤", type: "text" },
          { id: "telefono", label: "Teléfono", icon: "📞", type: "tel" },
          { id: "email", label: "E-mail", icon: "✉️", type: "email" },
        ].map((f) => (
          <div key={f.id}>
            <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
              <span>{f.icon}</span> {f.label}
            </label>
            <input
              type={f.type}
              name={f.id}
              required={f.id !== "telefono"}
              className="w-full border border-ui-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-ui-gray focus:outline-none focus:border-primary transition-colors bg-white"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
          <span>💬</span> Cuéntanos más sobre tu proyecto{" "}
          <span className="text-ui-gray font-normal">(opcional)</span>
        </label>
        <textarea
          name="mensaje"
          rows={4}
          placeholder="Escribe aquí..."
          className="w-full border border-ui-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-ui-gray focus:outline-none focus:border-primary transition-colors bg-white resize-none"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-ui-gray flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Tu información está segura con nosotros.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-60 flex-shrink-0"
        >
          {loading ? "Enviando..." : "Enviar mensaje"}
          {!loading && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
