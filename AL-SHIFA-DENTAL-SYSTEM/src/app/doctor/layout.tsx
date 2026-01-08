"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Stethoscope, 
  CreditCard,
  LogOut, 
  Menu, 
  X,
  Calendar,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthAPI } from "@/lib/api";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [docName, setDocName] = useState("Doctor");
  
  // --- EXISTING PROJECT B LOGIC ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await AuthAPI.getMe();
        const name = res.data.full_name || "Doctor";
        setDocName(name);
      } catch (error) {
        console.error("Failed to load doctor details", error);
      }
    };
    fetchProfile();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/auth/doctor/login");
  };

  // Your original Project B Items, mapped to icons
  const navItems = [
    { label: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
    { label: "My Schedule", href: "/doctor/schedule", icon: Calendar },
    { label: "My Patients", href: "/doctor/patients", icon: Users },
    { label: "Inventory", href: "/doctor/inventory", icon: Package },
    { label: "Treatments", href: "/doctor/treatments", icon: Stethoscope },
    { label: "Financials", href: "/doctor/finance", icon: CreditCard },
  ];

  // --- PROJECT A DESIGN STRUCTURE ---
  return (
    <div className="flex min-h-screen w-full bg-slate-50 relative overflow-hidden">
      
      {/* 🟣 1. FLOATING TOGGLE (The "Royal" Look) */}
      <div className="fixed top-6 left-6 z-50">
        <Button 
          size="icon" 
          aria-label="Toggle Navigation Menu"
          className="h-12 w-12 rounded-full shadow-xl bg-slate-900 hover:bg-slate-800 text-white transition-all duration-300 hover:scale-105"
          onClick={() => setSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* 🟣 2. SIDEBAR (Fixed & Dark) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-white shadow-2xl transform transition-transform duration-500 ease-out 
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-24 flex items-center px-8 border-b border-slate-800/50 bg-slate-950/30 pl-24">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Al-Shifa</h1>
            <p className="text-xs text-emerald-400 font-medium tracking-wider">
              {docName.toUpperCase()}
            </p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.label} 
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center justify-between px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200
                  ${isActive 
                    ? "bg-emerald-600/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                <div className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${isActive ? "text-emerald-400" : "group-hover:text-white transition-colors"}`} />
                    {item.label}
                </div>
                {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-6 border-t border-slate-800/50 bg-slate-950/30">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* 🟣 3. MAIN CONTENT (No Header Bar) */}
      <main 
        className={`flex-1 min-h-screen transition-all duration-500 ease-in-out p-6 md:p-12
        ${isSidebarOpen ? "ml-0 md:ml-0 opacity-50 blur-sm pointer-events-none" : "ml-0"}`}
      >
        {/* Invisible Spacer: Pushes content down so it doesn't hide behind the floating button */}
        <div className="h-12 w-full mb-8" /> 

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
           {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}