"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Activity, Shield, Sparkles, Brain, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  const [showSplash, setShowSplash] = useState(true);
  const [mounted, setMounted] = useState(false);

  // --- SPLASH SCREEN LOGIC ---
  useEffect(() => {
    setMounted(true); // Triggers animations
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // 2.5s delay for branding
    return () => clearTimeout(timer);
  }, []);

  // --- RENDER: SPLASH SCREEN ---
  if (showSplash) {
    return (
      <main className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white overflow-hidden">
        <div className={`transition-all duration-1000 ease-out flex flex-col items-center ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
          
          {/* Animated Logo */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-teal-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-950 border border-slate-800 shadow-2xl">
               <Activity className="h-12 w-12 text-teal-400" />
            </div>
            {/* Subtle Orbiting Dot */}
            <div className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-white shadow-sm animate-ping"></div>
          </div>

          {/* Branding */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-blue-200">
            AL-SHIFA
          </h1>
          <p className="mt-4 text-slate-400 font-mono text-sm tracking-[0.3em] uppercase">
            Neural Dental Core • v2.4
          </p>
          
          {/* Loading Dots */}
          <div className="mt-8 flex gap-2">
            <div className="h-2 w-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 bg-teal-500 rounded-full animate-bounce"></div>
          </div>
        </div>
      </main>
    );
  }

  // --- RENDER: MAIN LANDING PAGE ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900 overflow-hidden animate-in fade-in duration-1000">
      
      {/* 1. CLEAN HEADER */}
      <header className="w-full px-6 py-6 flex justify-between items-center max-w-7xl mx-auto z-10 relative">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-gradient-to-br from-teal-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight hidden md:block">
            Al-Shifa<span className="text-teal-600">.AI</span>
          </span>
        </div>
        
        {/* Simple Top Nav */}
        <div className="flex gap-6 text-sm font-medium text-slate-500">
          <span className="cursor-pointer hover:text-teal-600 transition-colors">Emergency</span>
          <span className="cursor-pointer hover:text-teal-600 transition-colors">Contact</span>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-0">
        
        {/* Background Blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-100/40 rounded-full blur-3xl pointer-events-none -z-10 mix-blend-multiply"></div>
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-10 mix-blend-multiply"></div>

        {/* Feature Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-teal-100 text-teal-700 text-xs font-bold uppercase tracking-wider mb-8 shadow-sm animate-in slide-in-from-bottom-4 fade-in duration-700">
          <Sparkles className="h-3 w-3 fill-teal-500 text-teal-500" />
          Next-Gen Intelligence
        </div>

        {/* Headlines */}
        <h1 className="max-w-5xl text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 mb-6 leading-[1.1] animate-in slide-in-from-bottom-8 fade-in duration-1000">
          The Future of <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">
            Dental Healthcare
          </span>
        </h1>

        <p className="max-w-xl text-lg md:text-xl text-slate-500 mb-10 leading-relaxed font-light animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-100">
          Experience AI-powered diagnosis, smart scheduling, and seamless patient management. 
          The clinic of tomorrow, available today.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in slide-in-from-bottom-12 fade-in duration-1000 delay-200">
          <Link href="/auth/role-selection">
            <Button 
              size="lg" 
              className="h-14 px-10 text-lg rounded-full bg-teal-700 hover:bg-teal-600 text-white shadow-xl shadow-teal-900/20 transition-all hover:scale-105 w-full sm:w-auto"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Feature Pills */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 text-left max-w-4xl w-full animate-in fade-in duration-1000 delay-500">
          <div className="group flex items-center gap-4 p-5 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">AI Diagnosis</p>
              <p className="text-xs text-slate-500">Instant analysis</p>
            </div>
          </div>
          
          <div className="group flex items-center gap-4 p-5 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Secure Data</p>
              <p className="text-xs text-slate-500">Encrypted records</p>
            </div>
          </div>

          <div className="group hidden md:flex items-center gap-4 p-5 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className="h-12 w-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Live Monitor</p>
              <p className="text-xs text-slate-500">Real-time stats</p>
            </div>
          </div>
        </div>
      </main>

      {/* 3. MINIMAL FOOTER */}
      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-100/50 bg-white/30 backdrop-blur-sm">
        <p>© 2026 Al-Shifa Neural Core. All systems operational.</p>
      </footer>
    </div>
  );
}