"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, LogOut, Shield, UserSquare2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.clear();
    router.push("/auth/role-selection");
  };

  const isActive = (path: string) => pathname === path ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200";

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
           <Shield className="h-8 w-8 text-red-500" />
           <div>
             <h1 className="font-bold tracking-tight text-lg">Al-Shifa</h1>
             <p className="text-[10px] text-red-400 font-mono tracking-wider">ADMIN PANEL</p>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin/dashboard" className={`flex items-center px-4 py-3 rounded-lg transition-all ${isActive('/admin/dashboard')}`}>
             <LayoutDashboard className="h-5 w-5 mr-3" /> Dashboard
          </Link>
          
          <div className="px-4 py-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-6">Database Management</div>
          
          <Link href="/admin/organizations" className={`flex items-center px-4 py-2 rounded-lg transition-all ${isActive('/admin/organizations')}`}>
             <Building2 className="h-4 w-4 mr-3" /> Organizations
          </Link>
          <Link href="/admin/doctors" className={`flex items-center px-4 py-2 rounded-lg transition-all ${isActive('/admin/doctors')}`}>
             <Users className="h-4 w-4 mr-3" /> Doctors
          </Link>
          <Link href="/admin/patients" className={`flex items-center px-4 py-2 rounded-lg transition-all ${isActive('/admin/patients')}`}>
             <UserSquare2 className="h-4 w-4 mr-3" /> Patients
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">
            <LogOut className="h-4 w-4 mr-3" /> Terminate Session
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white h-16 border-b border-slate-200 shadow-sm flex items-center px-8 justify-between z-10">
           <h2 className="text-sm font-semibold text-slate-500">System Administrator</h2>
           <div className="flex items-center gap-3">
             <span className="text-xs text-slate-400">admin@system</span>
             <div className="h-8 w-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-offset-2 ring-red-100">SA</div>
           </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {children}
        </div>
      </main>
    </div>
  );
}