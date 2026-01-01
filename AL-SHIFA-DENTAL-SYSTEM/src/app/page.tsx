"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Stethoscope } from "lucide-react";

export default function SplashScreen() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      router.push("/auth/role-selection");
    }, 2500); // 2.5s delay for branding
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className={`transition-all duration-1000 ease-out flex flex-col items-center ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
        
        {/* Logo Animation */}
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-doctor/20"></div>
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-doctor shadow-xl">
             <Stethoscope className="h-12 w-12 text-white" />
          </div>
          {/* Subtle Activity Pulse */}
          <div className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow-sm">
             <Activity className="h-6 w-6 text-patient animate-pulse" />
          </div>
        </div>

        {/* Branding Text */}
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Al-Shifa <span className="text-doctor">Clinical</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500">Dental Intelligence System</p>
        
        {/* Loading Indicator */}
        <div className="mt-8 flex items-center space-x-2">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-doctor [animation-delay:-0.3s]"></div>
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-doctor [animation-delay:-0.15s]"></div>
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-doctor"></div>
        </div>
        
        <p className="mt-4 text-xs font-medium text-slate-400 animate-pulse">
          Initializing AI Agents...
        </p>
      </div>
    </main>
  );
}
