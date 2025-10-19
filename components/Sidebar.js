// components/Sidebar.js — FINAL v2025.10F (Add Social Scheduler Menu)
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ListChecks,
  Mail,
  Sun,
  Moon,
  Menu,
  LogOut,
  X,
  Calendar,
  Image as ImageIcon,
  BarChart2,
  Users2,
  User2,
  UserSquare2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const { pathname } = router;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // === MENU ITEM ===
  const MenuItem = ({ href, icon: Icon, label }) => {
    const active = pathname === href;
    return (
      <Link href={href}>
        <span
          className={`flex items-center ${
            collapsed ? "justify-center" : "justify-start px-3"
          } py-2 text-sm rounded-md cursor-pointer transition-colors duration-150 ${
            active
              ? "bg-indigo-600 text-white font-semibold"
              : "text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Icon size={18} className={collapsed ? "" : "mr-2"} />
          {!collapsed && label}
        </span>
      </Link>
    );
  };

  const SidebarContent = (
    <div
      className={`h-full flex flex-col bg-white dark:bg-gray-900 shadow-lg transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* 1️⃣ Header: Collapse Button + MarkItDown */}
      <div
        className={`flex items-center ${
          collapsed ? "justify-center" : "justify-start"
        } p-3 border-b dark:border-gray-700`}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
        >
          <Menu size={18} />
        </button>
        {!collapsed && (
          <span className="ml-2 text-lg font-bold text-gray-900 dark:text-white">
            MarkItDown
          </span>
        )}
      </div>

      {/* 2️⃣ Theme Toggle */}
      <div
        className={`p-4 border-b dark:border-gray-700 flex items-center ${
          collapsed ? "justify-center" : "justify-start"
        }`}
      >
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {!collapsed && (
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            {theme === "dark" ? "Dark Mode" : "Light Mode"}
          </span>
        )}
      </div>

      {/* 3️⃣ Main Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* === MARKITDOWN CORE === */}
        <MenuItem href="/" icon={LayoutDashboard} label="Dashboard" />
        <MenuItem href="/overview" icon={ListChecks} label="Overview" />
        <MenuItem href="/timeline" icon={ListChecks} label="Timeline" />
        <MenuItem href="/email-setting" icon={Mail} label="Email Setting" />

        {/* === SOCIAL SCHEDULER MODULE === */}
        <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-3">
          {!collapsed && (
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 px-3 uppercase tracking-wide">
              Social Scheduler
            </p>
          )}
          <MenuItem href="/social" icon={Calendar} label="Queue" />
          <MenuItem href="/social/composer" icon={ImageIcon} label="Composer" />
          <MenuItem href="/social/calendar" icon={Calendar} label="Calendar" />
          <MenuItem href="/social/analytics" icon={BarChart2} label="Analytics" />
          <MenuItem href="/social/accounts" icon={Users2} label="Accounts" />
          <MenuItem href="/social/monitor" icon={UserSquare2} label="Monitor" />
        </div>
      </nav>

      {/* 4️⃣ Footer */}
      <div
        className={`p-4 border-t dark:border-gray-700 flex items-center ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2025 MarkItDown
          </p>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center ${
            collapsed ? "justify-center" : ""
          } text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400`}
        >
          <LogOut size={16} className={collapsed ? "" : "mr-1"} />
          {!collapsed && "Logout"}
        </button>
      </div>
    </div>
  );

  // === MAIN RENDER ===
  return (
    <>
      {/* ✅ Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-gray-900 p-3 shadow">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-md text-gray-700 dark:text-gray-200"
        >
          <Menu size={22} />
        </button>
        <span className="font-bold text-gray-800 dark:text-white">
          MarkItDown
        </span>
      </div>

      {/* ✅ Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-40"
            onClick={() => setMobileOpen(false)}
          ></div>
          <div className="relative bg-white dark:bg-gray-900 w-64 h-full shadow-xl animate-slideInLeft z-50">
            <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                Menu
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-3rem)]">
              {SidebarContent}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Desktop Sidebar */}
      <div className="hidden md:flex">{SidebarContent}</div>
    </>
  );
}
