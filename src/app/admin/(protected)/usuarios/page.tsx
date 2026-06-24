"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, AdminCard, Table, Td, Btn, AdminSelect, EmptyState } from "@/components/admin/ui";

const ROLES = ["customer", "agent", "admin"] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABELS: Record<Role, string> = { customer: "Cliente", agent: "Agente", admin: "Admin" };
const ROLE_COLORS: Record<Role, string> = { customer: "bg-gray-100 text-gray-600", agent: "bg-blue-100 text-blue-700", admin: "bg-primary/10 text-primary" };

export default function UsuariosPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("profiles").select("id, full_name, email, role, created_at").order("created_at", { ascending: false });
    setUsers(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function changeRole(userId: string, role: Role) {
    setSaving(userId);
    await supabase.from("profiles").update({ role }).eq("id", userId);
    await load();
    setSaving(null);
  }

  const filtered = users.filter((u) =>
    !q || (u.full_name ?? "").toLowerCase().includes(q.toLowerCase()) || (u.email ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="Usuarios" subtitle="Gestiona roles de acceso al sistema" />

      <AdminCard>
        <div className="p-4 border-b border-ui-border">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o email..."
            className="w-full max-w-xs px-3 py-2 border border-ui-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        {!filtered.length ? (
          <EmptyState message="Sin usuarios." />
        ) : (
          <Table headers={["Nombre", "Email", "Rol", "Registro", "Cambiar rol"]}>
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <Td><span className="font-medium">{u.full_name ?? "—"}</span></Td>
                <Td><span className="text-ui-gray text-sm">{u.email}</span></Td>
                <Td>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role as Role] ?? "bg-gray-100 text-gray-500"}`}>
                    {ROLE_LABELS[u.role as Role] ?? u.role}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-ui-gray">
                    {new Date(u.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <AdminSelect
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as Role)}
                      disabled={saving === u.id}
                      className="text-xs py-1 px-2 w-auto"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </AdminSelect>
                    {saving === u.id && <span className="text-xs text-ui-gray">...</span>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </AdminCard>
    </div>
  );
}
