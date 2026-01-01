"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Plus, FileText, Phone, Sparkles, LogOut, XCircle, ChevronRight, User, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api"; // API Helper Import kiya

export default function PatientDashboard() {
  const router = useRouter();
  const [appointment, setAppointment] = useState<any>(null);
  const [countdown, setCountdown] = useState({ h: 2, m: 45, s: 0 });
  
  // New State for User Profile
  const [userName, setUserName] = useState("Loading...");
  const [userEmail, setUserEmail] = useState("");

  // 1. Check Login & Fetch Profile
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    // Agar token nahi hai, toh Login par bhejo
    if (!token) {
      router.push("/auth/patient/login");
      return;
    }

    // Backend se User ka naam mangwao
    const fetchProfile = async () => {
      try {
        const response = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserName(response.data.full_name);
        setUserEmail(response.data.email);
      } catch (error) {
        console.error("Session Expired", error);
        localStorage.removeItem("token");
        router.push("/auth/patient/login");
      }
    };

    fetchProfile();

    // Load Local Appointment (Existing Logic)
    const saved = localStorage.getItem("latestAppointment");
    if (saved) {
      setAppointment(JSON.parse(saved));
      const timer = setInterval(() => {
        setCountdown(prev => ({ ...prev, s: prev.s === 0 ? 59 : prev.s - 1 }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear Token
    localStorage.removeItem("role");
    router.push('/auth/role-selection');
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      localStorage.removeItem("latestAppointment");
      setAppointment(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* --- HEADER SECTION --- */}
      <header className="relative overflow-hidden bg-gradient-to-br from-patient-dark to-patient pb-24 pt-8 px-6 shadow-2xl rounded-b-[40px]">
        {/* Decorative Circles */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute top-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
        
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <p className="text-patient-light text-xs font-bold uppercase tracking-widest opacity-80">Welcome Back</p>
            {/* DYNAMIC NAME HERE */}
            <h1 className="text-3xl font-extrabold text-white mt-1 capitalize">{userName}</h1>
            <p className="text-xs text-white/60">{userEmail}</p>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={handleLogout} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all text-white border border-white/20 shadow-lg">
               <LogOut className="h-5 w-5" />
             </button>
             <Link href="/shared/profile">
               <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border-2 border-white/40 cursor-pointer hover:bg-white/30 transition-all shadow-xl">
                  <User className="h-6 w-6 text-white" />
               </div>
             </Link>
          </div>
        </div>
      </header>

      <div className="px-6 -mt-16 relative z-20 space-y-8">
        
        {/* --- HERO CARD (Same Design) --- */}
        <div className="rounded-3xl bg-white p-1 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
          <div className="rounded-[20px] border border-slate-100 bg-white overflow-hidden">
            {appointment ? (
              <div className="p-0">
                 <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                   <div className="flex items-center gap-2 text-white">
                     <span className="relative flex h-3 w-3">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                     </span>
                     <span className="text-sm font-bold tracking-wide">CONFIRMED</span>
                   </div>
                   <div className="text-slate-400 text-xs font-mono">ID: #89201</div>
                 </div>

                 <div className="p-6">
                   <div className="flex flex-col md:flex-row gap-6 items-center">
                     <div className="flex-1 space-y-2">
                       <h2 className="text-2xl font-bold text-slate-900">{appointment.treatment}</h2>
                       <p className="text-slate-500 font-medium flex items-center gap-2">
                         <User className="h-4 w-4 text-patient" /> {appointment.doctor}
                       </p>
                       <div className="flex flex-wrap gap-2 mt-3">
                         <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                           <Calendar className="h-3 w-3" /> {appointment.date}
                         </span>
                         <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                           <Clock className="h-3 w-3" /> {appointment.time}
                         </span>
                       </div>
                     </div>

                     <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-[180px] text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Starts In</p>
                        <div className="flex justify-center gap-2 text-2xl font-mono font-bold text-slate-800">
                          <span>{countdown.h}<span className="text-[10px] text-slate-400 align-top ml-0.5">H</span></span>:
                          <span>{countdown.m}<span className="text-[10px] text-slate-400 align-top ml-0.5">M</span></span>:
                          <span className="text-patient">{countdown.s}<span className="text-[10px] text-patient/60 align-top ml-0.5">S</span></span>
                        </div>
                     </div>
                   </div>

                   <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
                      <Link href="/patient/appointments/new" className="flex-1">
                         <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200 text-slate-600 hover:text-patient hover:border-patient hover:bg-patient/5 font-bold transition-all">
                            <CalendarDays className="mr-2 h-4 w-4"/> Reschedule
                         </Button>
                      </Link>
                      <Button onClick={handleCancel} variant="ghost" className="h-12 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 font-bold transition-all px-6">
                         <XCircle className="mr-2 h-4 w-4"/> Cancel
                      </Button>
                   </div>
                 </div>
              </div>
            ) : (
              <div className="text-center py-10 px-6">
                <div className="mx-auto h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Appointments</h3>
                <p className="text-slate-500 text-sm mb-6">You haven't booked any visit yet.</p>
                <Link href="/patient/appointments/new">
                  <Button className="h-12 px-8 rounded-full bg-patient hover:bg-patient-dark shadow-lg shadow-patient/30 text-white font-bold transition-transform hover:scale-105">
                    Book Your First Visit
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* --- QUICK ACTIONS (With Line Designs) --- */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2 px-1">
            <Sparkles className="h-5 w-5 text-yellow-500" /> Quick Actions
          </h2>
          
          <div className="grid grid-cols-2 gap-5">
            <Link href="/patient/appointments/new">
              <div className="group relative h-44 overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-xl shadow-blue-500/20 transition-all hover:shadow-blue-500/40 hover:-translate-y-1 cursor-pointer">
                <div className="absolute right-0 top-0 h-full w-full opacity-10">
                   <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M0 100 C 20 0 50 0 100 100 Z" fill="none" stroke="white" strokeWidth="2" />
                      <path d="M0 80 C 40 10 70 10 100 80 Z" fill="none" stroke="white" strokeWidth="2" />
                   </svg>
                </div>
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">New Booking</h3>
                    <p className="text-blue-100 text-sm opacity-90">Find a doctor</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/patient/records">
              <div className="group relative h-44 overflow-hidden rounded-[24px] bg-gradient-to-br from-purple-600 to-purple-700 p-6 text-white shadow-xl shadow-purple-500/20 transition-all hover:shadow-purple-500/40 hover:-translate-y-1 cursor-pointer">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">My Records</h3>
                    <p className="text-purple-100 text-sm opacity-90">Prescriptions</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <Link href="/patient/emergency">
            <div className="mt-5 group relative overflow-hidden rounded-[24px] bg-gradient-to-r from-red-50 to-red-100 p-1 border border-red-100 shadow-sm cursor-pointer transition-all hover:shadow-lg hover:shadow-red-500/10">
              <div className="relative flex items-center justify-between bg-white/60 p-5 rounded-[20px] backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center shadow-sm text-red-600 ring-4 ring-white">
                    <Phone className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-900">Emergency Call</h3>
                    <p className="text-sm text-red-600 font-medium">Immediate Assistance</p>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all">
                  <ChevronRight className="h-6 w-6" />
                </div>
              </div>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}