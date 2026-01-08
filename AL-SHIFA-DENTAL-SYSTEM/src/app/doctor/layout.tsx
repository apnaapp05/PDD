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
  Calendar
} from "lucide-react";
import { AuthAPI } from "@/lib/api";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [docName, setDocName] = useState("Loading...");
  const [initials, setInitials] = useState("DR");

  useEffect(() => {
    const checkScreen = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);

    const fetchProfile = async () => {
      try {
        const res = await AuthAPI.getMe();
        const name = res.data.full_name || "Doctor";
        setDocName(name);
        const init = name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
        setInitials(init || "DR");
      } catch (error) {
        console.error("Failed to load doctor details", error);
      }
    };
    fetchProfile();

    return () => window.removeEventListener("resize", checkScreen);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/auth/doctor/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
    { label: "My Schedule", href: "/doctor/schedule", icon: Calendar },
    { label: "My Patients", href: "/doctor/patients", icon: Users },
    { label: "Inventory", href: "/doctor/inventory", icon: Package },
    { label: "Treatments & Prices", href: "/doctor/treatments", icon: Stethoscope },
    { label: "Financials", href: "/doctor/finance", icon: CreditCard },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside 
        className={`fixed md:relative z-50 h-full bg-indigo-900 text-white transition-all duration-300 flex flex-col
          ${isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden"}
        `}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-indigo-800">
           <div className="flex items-center gap-2 font-bold text-lg">
             <Stethoscope className="h-6 w-6 text-indigo-300" />
             <span className="whitespace-nowrap">Doctor Portal</span>
           </div>
           {isMobile && (
             <button onClick={() => setIsSidebarOpen(false)}>
               <X className="h-5 w-5 text-indigo-300" />
             </button>
           )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? "bg-indigo-800 text-white shadow-sm" 
                    : "text-indigo-100 hover:bg-indigo-800/50 hover:text-white"
                  }
                `}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-indigo-300" : "text-indigo-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-200 hover:bg-red-900/30 hover:text-red-100 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md hover:bg-slate-100 text-slate-600 focus:outline-none"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-slate-700">{docName}</p>
               <p className="text-[10px] text-slate-500">Verified Practitioner</p>
             </div>
             <div className="h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center border border-indigo-200 text-indigo-700 font-bold text-xs">
               {initials}
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}