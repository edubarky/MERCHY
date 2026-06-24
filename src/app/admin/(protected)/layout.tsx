import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/admin/Sidebar";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || !["agent", "admin"].includes(profile.role)) {
    redirect("/");
  }

  const userName = profile.full_name ?? profile.email ?? "Usuario";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        role={profile.role as "agent" | "admin"}
        userName={userName}
        userEmail={profile.email ?? ""}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex-shrink-0 h-16 bg-white border-b border-ui-border flex items-center justify-between px-6">
          <a
            href="/catalogo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-ui-border text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Ver catálogo
          </a>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ui-gray hidden sm:block">{profile.email}</span>
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {initial}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
