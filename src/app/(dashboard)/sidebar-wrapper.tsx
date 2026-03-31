"use client";

import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import type { Role } from "@/auth";

export function SidebarWrapper() {
  const { data: session } = useSession();
  if (!session) return null;

  return (
    <Sidebar
      userRole={session.user.role as Role}
      userName={session.user.name ?? ""}
    />
  );
}
