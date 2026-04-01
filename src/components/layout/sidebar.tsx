"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  CheckCircle,
  Settings,
  Users,
  LogOut,
  ImageIcon,
  Menu,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { Role } from "@/auth";

interface SidebarProps {
  userRole: Role;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/settings/images").then((r) => r.json()).then((d) => setLogoUrl(d.logo));
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems = [
    { label: "儀表板", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "FINANCE", "SALES"] as Role[] },
    { label: "報價單", href: "/quotations", icon: FileText, roles: ["ADMIN", "FINANCE", "SALES"] as Role[] },
    { label: "待審核", href: "/approvals", icon: CheckCircle, roles: ["ADMIN", "FINANCE"] as Role[] },
    { label: "已核准", href: "/approved", icon: CheckCircle, roles: ["ADMIN", "FINANCE"] as Role[] },
    { label: "報價單管理", href: "/templates", icon: Settings, roles: ["ADMIN"] as Role[] },
    { label: "使用者管理", href: "/users", icon: Users, roles: ["ADMIN"] as Role[] },
    { label: "系統設定", href: "/settings", icon: ImageIcon, roles: ["ADMIN"] as Role[] },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="全偲行銷" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-bold text-white">C</div>
          )}
          <span className="text-base font-bold text-gray-900">全偲行銷</span>
        </Link>
        {/* Mobile close button */}
        <button onClick={() => setMobileOpen(false)} className="md:hidden rounded-lg p-1.5 text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-gray-200 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
            {userName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
            <p className="text-xs text-gray-500">
              {userRole === "ADMIN" ? "管理員" : userRole === "FINANCE" ? "財務審核" : "業務"}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          登出
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="全偲行銷" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-bold text-white">C</div>
          )}
          <span className="text-sm font-bold text-gray-900">全偲行銷</span>
        </div>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
        {sidebarContent}
      </aside>
    </>
  );
}
