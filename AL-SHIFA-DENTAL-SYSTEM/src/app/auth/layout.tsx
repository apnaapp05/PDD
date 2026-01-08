"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Menu, X, Home, Activity, Globe, 
  Layers, User, LayoutGrid, ChevronRight, Sparkles,
  Building2, ShieldCheck // Added Icons
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 🎨 DYNAMIC THEMING ENGINE
  const isDoctor = pathname.includes("doctor");
  const isAdmin = pathname.includes("admin");
  const isOrg = pathname.includes("organization");
  const isPatient = pathname.includes("patient");

  // Default Theme (Role Selection)
  let accentColor = "bg-blue-600";
  let bgGradient = "from-slate-900 via-blue-950 to-slate-900";
  let sidebarGradient = "from-blue-600/10 to-indigo-600/10";
  let roleLabel = "WELCOME HOME";
  let HeroIcon = Home;

  // Portal Specific Overrides
  if (isDoctor) {
    accentColor = "bg-emerald-600";
    bgGradient = "from-emerald-950 via-slate-950 to-emerald-950"; 
    sidebarGradient = "from-emerald-600/10 to-teal-600/10";
    roleLabel = "DOCTOR PORTAL";
    HeroIcon = Activity;
  } else if (isAdmin) {
    accentColor = "bg-indigo-600";
    bgGradient = "from-indigo-950 via-purple-950 to-slate-900";
    sidebarGradient = "from-indigo-600/10 to-purple-600/10";
    roleLabel = "SYSTEM CONTROL";
    HeroIcon = Layers;
  } else if (isOrg) {
    accentColor = "bg-cyan-600";
    bgGradient = "from-cyan-950 via-slate-900 to-blue-950";
    sidebarGradient = "from-cyan-600/10 to-blue-600/10";
    roleLabel = "ORGANIZATION";
    HeroIcon = Globe;
  } else if (isPatient) {
    accentColor = "bg-teal-600";
    bgGradient = "from-teal-950 via-slate-900 to-emerald-950";
    sidebarGradient = "from-teal-600/10 to-emerald-600/10";
    roleLabel = "PATIENT PORTAL";
    HeroIcon = User;
  }

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-slate-50 selection:bg-blue-100 selection:text-blue-900">
      
      {/* 1. FLOATING TOGGLE BUTTON (Glassmorphism) */}
      <div className="fixed top-6 left-6 z-50 animate-in fade-in zoom-in duration-700">
        <Button 
          size="icon" 
          className={`h-12 w-12 rounded-full backdrop-blur-md border border-white/20 shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group
            ${isMenuOpen 
              ? "bg-white/10 text-white hover:bg-white/20" 
              : "bg-white/80 text-slate-800 hover:bg-white hover:text-blue-600"
            }`}
          onClick={() => setMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </Button>
      </div>

      {/* 2. ADVANCED GLASS SIDEBAR (The "Slide Bar") */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-[350px] transform transition-transform duration-500 cubic-bezier(0.25, 0.8, 0.25, 1) 
        ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Sidebar Background with Blur & Gradient */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl border-r border-white/40 shadow-[10px_0_40px_rgba(0,0,0,0.1)]">
           <div className={`absolute inset-0 bg-gradient-to-b ${sidebarGradient} opacity-50`}></div>
        </div>

        {/* Sidebar Content */}
        <div className="relative h-full flex flex-col p-8 pt-24">
          
          {/* Logo Section */}
          <div className="mb-10 animate-in slide-in-from-left-4 fade-in duration-700 delay-100">
            <div className="flex items-center gap-3 mb-2">
               <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                 <Sparkles className="h-5 w-5" />
               </div>
               <span className="text-2xl font-black text-slate-900 tracking-tight">Al-Shifa</span>
            </div>
            <p className="text-xs font-medium text-slate-500 tracking-widest uppercase pl-1">Clinical Intelligence</p>
          </div>

          {/* Clean Navigation Menu */}
          <nav className="space-y-3 flex-1 overflow-y-auto pr-2">
            
            {/* Main Links */}
            <Link 
              href="/" 
              onClick={() => setMenuOpen(false)}
              className="group flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                   <Home className="h-5 w-5" />
                </div>
                <span className="font-bold text-slate-700 group-hover:text-slate-900">Home</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link 
              href="/auth/role-selection" 
              onClick={() => setMenuOpen(false)}
              className="group flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                   <LayoutGrid className="h-5 w-5" />
                </div>
                <span className="font-bold text-slate-700 group-hover:text-slate-900">All Portals</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
            </Link>

            {/* QUICK ACCESS SECTION */}
            <div className="pt-6 pb-2">
              <p className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Access</p>
              
              <Link 
                href="/auth/organization/login" 
                onClick={() => setMenuOpen(false)}
                className="group flex items-center gap-4 p-3 rounded-xl hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 transition-all duration-200 mb-2"
              >
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-cyan-200 group-hover:text-cyan-800 transition-colors">
                  <Building2 className="h-4 w-4" />
                </div>
                <span className="font-medium text-sm">Organization</span>
              </Link>

              <Link 
                href="/auth/admin/login" 
                onClick={() => setMenuOpen(false)}
                className="group flex items-center gap-4 p-3 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-all duration-200"
              >
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-200 group-hover:text-indigo-800 transition-colors">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="font-medium text-sm">Admin Portal</span>
              </Link>
            </div>

          </nav>

          {/* Footer Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 text-white shadow-xl mt-4">
             <p className="text-xs text-blue-200 font-medium mb-1">Need Assistance?</p>
             <p className="text-sm font-bold">support@alshifa.ai</p>
          </div>
        </div>
      </aside>

      {/* 3. SPLIT SCREEN LAYOUT */}
      
      {/* LEFT: VISUAL (Fixed Desktop) */}
      <div className={`hidden lg:flex lg:w-5/12 relative bg-gradient-to-br ${bgGradient} items-center justify-center overflow-hidden border-r border-white/5`}>
         {/* Animated Orbs */}
         <div className={`absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 mix-blend-screen ${accentColor} -translate-y-1/2 translate-x-1/2 animate-pulse-slow`}></div>
         <div className={`absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 mix-blend-screen ${accentColor} translate-y-1/2 -translate-x-1/2 animate-pulse`}></div>
         
         <div className="relative z-10 p-16 text-white max-w-lg animate-in slide-in-from-left duration-1000">
            <div className="mb-10">
                <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
                   <HeroIcon className="h-10 w-10 text-white" />
                </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[11px] font-bold tracking-[0.2em] uppercase shadow-lg text-blue-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {roleLabel}
            </div>
            
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[0.9] drop-shadow-2xl">
              Future <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">Ready.</span>
            </h2>
            <p className="text-xl text-blue-100/80 leading-relaxed font-light border-l-2 border-white/20 pl-6">
              Access the most advanced dental intelligence network. Secure, seamless, and powered by AI.
            </p>
         </div>
      </div>

      {/* RIGHT: CONTENT (Scrollable) */}
      <div className="w-full lg:w-7/12 h-screen overflow-y-auto bg-slate-50 flex flex-col p-6 md:p-12 relative scroll-smooth">
         
         {/* Mobile Top Gradient Bar */}
         <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${isDoctor ? "from-emerald-500 to-teal-500" : isPatient ? "from-teal-500 to-blue-500" : "from-blue-500 to-indigo-500"} lg:hidden z-10`}></div>

         <main className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 my-auto mx-auto z-0">
            {children}
         </main>
      </div>

      {/* Dark Overlay for Mobile Sidebar */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500" 
          onClick={() => setMenuOpen(false)} 
        />
      )}
    </div>
  );
}