import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Header({ onMenuClick, title }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all duration-300">
      
      {/* LEFT: The Royal Circular Trigger */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onMenuClick}
          className="rounded-full h-12 w-12 bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-sm transition-transform active:scale-95 flex items-center justify-center group"
        >
          <Menu className="h-6 w-6 text-slate-700 group-hover:text-teal-700 transition-colors" />
        </Button>
        
        {/* Page Title (Optional context) */}
        <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden md:block">
          {title || "Al-Shifa Dashboard"}
        </h1>
      </div>

      {/* RIGHT: Notifications & Profile (Minimal) */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-teal-600 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
        </Button>
        <div className="h-8 w-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-teal-50">
          A
        </div>
      </div>
    </header>
  );
}