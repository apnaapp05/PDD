"use client";

import React from "react";
import RoleSwitcher from "./RoleSwitcher";
import RoleNavigation from "./RoleNavigation";
import { X, ShieldCheck } from "lucide-react";

export default function Sidebar({ isOpen, onClose }) {
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
      <aside className="relative w-[85%] max-w-[320px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-blue-200" />
            <div>
              <h2 className="text-lg font-bold leading-none">Al-Shifa</h2>
              <p className="text-[10px] text-blue-100 uppercase tracking-wider font-medium opacity-80 mt-1">
                Secure Portal
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Pass onClose to sub-components */}
          <RoleSwitcher onItemClick={onClose} />
          
          <div>
            <p className="px-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Menu
            </p>
            <RoleNavigation onItemClick={onClose} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">Powered by <span className="font-semibold text-slate-600">Agentic AI Core v2.1</span></p>
        </div>
      </aside>
    </div>
  );
}