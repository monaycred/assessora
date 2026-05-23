"use client";

import { Bell, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 border-b border-dark-800/50 flex items-center justify-between px-6 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-30">
      <div>
        <h1 className="text-base font-semibold text-white">{title}</h1>
        {subtitle && (
          <p className="text-xs text-dark-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-dark-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-dark-900 border border-dark-700/50 rounded-lg pl-9 pr-4 py-2 text-xs text-dark-300 placeholder-dark-500 focus:outline-none focus:border-primary-500/50 w-52"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary-500">G</span>
        </div>
      </div>
    </header>
  );
}
