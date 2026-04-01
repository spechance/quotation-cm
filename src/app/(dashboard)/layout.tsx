import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { SidebarWrapper } from "./sidebar-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden">
        <SidebarWrapper />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pt-16 md:p-6 md:pt-6">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
