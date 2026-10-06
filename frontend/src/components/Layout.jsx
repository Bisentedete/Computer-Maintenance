import React, { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AlertsBell from "@/components/AlertsBell";
import {
  LayoutDashboard, Monitor, AlertTriangle, Wrench, Users, Calendar,
  History, BarChart3, UserCog, Settings, LogOut, Menu, X, MessageSquare,
  FileText, ClipboardList, Server, WifiOff
} from "lucide-react";

const NAV = {
  admin: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/computers", label: "Computers", icon: Monitor },
    { to: "/alerts", label: "Offline Alerts", icon: WifiOff },
    { to: "/reports", label: "Problem Reports", icon: AlertTriangle },
    { to: "/maintenance", label: "Maintenance", icon: Wrench },
    { to: "/technicians", label: "Technicians", icon: UserCog },
    { to: "/schedules", label: "Schedules", icon: Calendar },
    { to: "/history", label: "Maintenance History", icon: History },
    { to: "/analytics", label: "Reports", icon: BarChart3 },
    { to: "/users", label: "Users", icon: Users },
    { to: "/troubleshooting", label: "Troubleshooting", icon: MessageSquare },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
  technician: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/maintenance", label: "My Tasks", icon: Wrench },
    { to: "/computers", label: "Computers", icon: Monitor },
    { to: "/alerts", label: "Offline Alerts", icon: WifiOff },
    { to: "/history", label: "Maintenance History", icon: History },
    { to: "/troubleshooting", label: "Troubleshooting", icon: MessageSquare },
  ],
  user: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/report", label: "Report a Problem", icon: AlertTriangle },
    { to: "/my-reports", label: "My Reports", icon: ClipboardList },
    { to: "/computer-status", label: "Computer Status", icon: Server },
    { to: "/troubleshooting", label: "Troubleshooting", icon: MessageSquare },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const items = NAV[user?.role] || [];

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-800 text-white">
          <Wrench size={16} strokeWidth={2.25} />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900 leading-none">CLMS</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Lab Maintenance</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => setOpen(false)}
              data-testid={`nav-${it.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-800 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`
              }
            >
              <Icon size={16} strokeWidth={2} />
              <span>{it.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
            {user?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-gray-900 truncate">{user?.name}</div>
            <div className="text-[11px] text-gray-500 capitalize">{user?.role}</div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200 bg-white">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden rounded-md p-1.5 text-gray-700 hover:bg-gray-100"
              onClick={() => setOpen(true)}
              data-testid="menu-toggle"
            >
              <Menu size={18} />
            </button>
            <div className="text-sm font-medium text-gray-700">
              Computer Laboratory Maintenance System
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(user?.role === "admin" || user?.role === "technician") && <AlertsBell />}
            <span className="hidden sm:inline text-xs text-gray-500">
              {user?.email}
            </span>
            <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 capitalize">
              {user?.role}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
