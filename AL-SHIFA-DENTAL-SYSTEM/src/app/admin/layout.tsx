"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Users, Building2, LogOut, Shield } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    router.push("/auth/role-selection");
  };

  return (
    <div className="flex h-screen w-full bg-slate-100">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
           <Shield className="h-8 w-8 text-red-500" />
           <div>
             <h1 className="font-bold tracking-tight">Al-Shifa</h1>
             <p className="text-[10px] text-red-400 font-mono">ADMIN MODE</p>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin/dashboard" className="flex items-center px-4 py-3 bg-white/5 rounded-lg text-white font-medium">
             <LayoutDashboard className="h-5 w-5 mr-3 text-slate-400" /> Dashboard
          </Link>
          <div className="px-4 py-2 text-xs text-slate-500 uppercase font-bold mt-4">Database</div>
          <Link href="/admin/organizations" className="flex items-center px-4 py-2 hover:bg-white/5 rounded-lg text-slate-300 transition-colors">
             <Building2 className="h-4 w-4 mr-3" /> Organizations
          </Link>
          <Link href="/admin/doctors" className="flex items-center px-4 py-2 hover:bg-white/5 rounded-lg text-slate-300 transition-colors">
             <Users className="h-4 w-4 mr-3" /> Doctors
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors">
            <LogOut className="h-4 w-4 mr-3" /> Terminate Session
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white h-16 border-b border-slate-200 shadow-sm flex items-center px-8 justify-between">
           <h2 className="text-sm font-semibold text-slate-500">System Administrator</h2>
           <div className="h-8 w-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">SA</div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}