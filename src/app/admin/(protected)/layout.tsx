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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        role={profile.role as "agent" | "admin"}
        userName={profile.full_name ?? profile.email ?? "Usuario"}
        userEmail={profile.email ?? ""}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
