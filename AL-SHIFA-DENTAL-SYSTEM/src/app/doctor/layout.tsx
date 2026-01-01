"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, Calendar, Users, Package, DollarSign, 
  Menu, X, LogOut, Bot
} from "lucide-react";
import { AuthAPI } from "@/lib/api"; // Import API to fetch real profile

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [doctorName, setDoctorName] = useState("Loading...");
  const [initials, setInitials] = useState("DR");
  const router = useRouter();

  // FETCH REAL USER PROFILE
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await AuthAPI.getMe();
        const fullName = response.data.full_name || "Doctor";
        setDoctorName(fullName);
        
        // Calculate Initials (e.g., "John Doe" -> "JD")
        const nameParts = fullName.split(" ");
        if (nameParts.length >= 2) {
          setInitials(`${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase());
        } else {
          setInitials(fullName.substring(0, 2).toUpperCase());
        }

      } catch (error) {
        console.error("Failed to fetch doctor profile", error);
        // If unauthorized, the API interceptor or protected route will handle redirect
      }
    };
    
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/auth/role-selection");
  };

  const navItems = [
    { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
    { name: "AI Agents", href: "/doctor/agents", icon: Bot }, 
    { name: "Schedule", href: "/doctor/schedule", icon: Calendar },
    { name: "Patients", href: "/doctor/patients", icon: Users },
    { name: "Inventory", href: "/doctor/inventory", icon: Package },
    { name: "Finance", href: "/doctor/finance", icon: DollarSign },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50">
      
      {/* Sidebar (Collapsible) */}
      <aside className={`transition-all duration-300 ease-in-out flex flex-col shadow-2xl z-20 
        ${isSidebarOpen ? "w-64" : "w-20"} 
        bg-gradient-to-b from-slate-900 to-slate-800 text-white`}
      >
        <div className="p-4 flex items-center justify-between">
          {isSidebarOpen && (
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Al-Shifa</h1>
              <p className="text-xs text-slate-400">Doctor Portal</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg">
             {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="flex-1 px-3 space-y-2 mt-4">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors
                ${!isSidebarOpen && "justify-center px-2"}`}
              title={!isSidebarOpen ? item.name : ""}
            >
              <item.icon className={`h-5 w-5 ${isSidebarOpen ? "mr-3" : ""}`} />
              {isSidebarOpen && item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className={`flex items-center w-full px-4 py-2 text-sm font-medium text-red-300 hover:text-white transition-colors
            ${!isSidebarOpen && "justify-center"}`}
          >
            <LogOut className={`h-5 w-5 ${isSidebarOpen ? "mr-3" : ""}`} />
            {isSidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
           <h2 className="text-lg font-semibold text-slate-800">Clinic Overview</h2>
           
           {/* Profile Link (Dynamic Name Fix) */}
           <Link href="/shared/profile">
             <div className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
               <div className="text-right hidden md:block">
                 <p className="text-sm font-bold text-slate-900">{doctorName}</p>
                 <p className="text-xs text-green-600 font-medium">Online</p>
               </div>
               <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold border-2 border-slate-200">
                 {initials}
               </div>
             </div>
           </Link>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}