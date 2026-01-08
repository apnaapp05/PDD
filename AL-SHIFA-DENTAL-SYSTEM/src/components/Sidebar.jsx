"use client";

import React from "react";
import RoleSwitcher from "./RoleSwitcher";
import RoleNavigation from "./RoleNavigation"; // Ensure this is imported!
import { X, ShieldCheck, Activity } from "lucide-react";

export default function Sidebar({ isOpen, onClose }) {
  // Prevent background scrolling when sidebar is open
  React.useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <aside className="relative w-[85%] max-w-[300px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-blue-200" />
            <div>
              <h2 className="text-lg font-bold leading-none tracking-tight">Al-Shifa</h2>
              <p className="text-[10px] text-blue-200 uppercase tracking-wider font-medium mt-1">
                Dental System
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Portal Switcher */}
          <RoleSwitcher onItemClick={onClose} />
          
          {/* Navigation Menu */}
          <div className="border-t border-slate-100 pt-4">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
            <RoleNavigation />
          </div>
        </div>

        {/* Footer (Cleaned) */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">© 2025 Al-Shifa Dental</p>
        </div>
      </aside>
    </div>
  );
}