"use client";

import { useState } from "react";
import { Bell, Moon, Search, ChevronLeft } from "lucide-react";
import Image from "next/image";

export default function TopBar() {
  const [theme, setTheme] = useState("light");

  return (
    <div className="fixed left-0 right-4 print:hidden z-50 bg-white dark:bg-gray-900 shadow">
      <nav className="border-gray-200 px-4 py-2 flex items-center justify-between">
        {/* Menu Toggle Button */}
        <button className="flex rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronLeft className="text-3xl text-gray-600 dark:text-gray-300" />
        </button>

        {/* Search Bar */}
        <div className="relative w-1/3 hidden md:block">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 bg-gray-100 p-2 pl-10 text-gray-700 focus:border-gray-400 focus:ring-2 focus:ring-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:focus:ring-gray-500"
            placeholder="Search..."
          />
        </div>

        {/* Right Icons (Theme Toggle, Notifications, Profile) */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <Moon className="text-3xl text-gray-600 dark:text-gray-300" />
          </button>

          {/* Notifications Icon */}
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <Bell className="text-3xl text-gray-600 dark:text-gray-300" />
          </button>

          {/* Profile Icon */}
          <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <Image src="/avatar-1.jpg" alt="User" width={32} height={32} className="rounded-full" />
          </button>
        </div>
      </nav>
    </div>
  );
}
