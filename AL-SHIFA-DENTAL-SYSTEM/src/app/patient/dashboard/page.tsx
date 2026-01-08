"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, FileText, Sparkles, LogOut, XCircle, User, CalendarDays, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { PatientAPI, AuthAPI } from "@/lib/api"; 

export default function PatientDashboard() {
  const router = useRouter();
  const [appointment, setAppointment] = useState<any>(null);
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });
  const [userName, setUserName] = useState("Loading...");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Define fetch function outside useEffect so we can re-use it
  const fetchDashboardData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/patient/login");
      return;
    }

    try {
      // Fetch User
      const userRes = await AuthAPI.getMe();
      setUserName(userRes.data.full_name);
      setUserEmail(userRes.data.email);

      // Fetch Real Appointments
      const apptRes = await PatientAPI.getMyAppointments();
      if (apptRes.data && apptRes.data.length > 0) {
        // Find the first non-cancelled, non-completed appointment if possible, else just the latest
        const latest = apptRes.data[0]; 
        setAppointment(latest);
        
        const apptTime = new Date(`${latest.date} ${latest.time}`).getTime();
        const now = new Date().getTime();
        const diff = apptTime - now;
        if (diff > 0) {
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setCountdown({ h: hours, m: minutes, s: 0 });
        }
      }
    } catch (error) {
      console.error("Session Error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push('/auth/role-selection');
  };

  // --- DIRECT CANCELLATION ---
  const handleCancel = async () => {
    if (!appointment) return;
    
    if (!confirm("Are you sure you want to CANCEL this appointment? This action cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      await PatientAPI.cancelAppointment(appointment.id);
      alert("Appointment has been cancelled.");
      // Refresh data to update status
      fetchDashboardData();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to cancel appointment");
      setLoading(false);
    }
  };

  const handleNavigate = () => {
    if (!appointment) return;
    
    if (!appointment.hospital_lat || !appointment.hospital_lng) {
      if (appointment.hospital_name) {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.hospital_name + " " + appointment.hospital_address)}`;
        window.open(url, '_blank');
        return;
      }
      alert("Hospital location details not available.");
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const url = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${appointment.hospital_lat},${appointment.hospital_lng}`;
        window.open(url, '_blank');
      }, (error) => {
         const url = `https://www.google.com/maps/search/?api=1&query=${appointment.hospital_lat},${appointment.hospital_lng}`;
         window.open(url, '_blank');
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* --- HEADER --- */}
      <header className="relative overflow-hidden bg-gradient-to-br from-blue-900 to-blue-600 pb-24 pt-8 px-6 shadow-2xl rounded-b-[40px]">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute top-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
        
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">Welcome Back</p>
            <h1 className="text-3xl font-extrabold text-white mt-1 capitalize">{userName}</h1>
            <p className="text-xs text-white/60">{userEmail}</p>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={handleLogout} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all text-white border border-white/20 shadow-lg">
               <LogOut className="h-5 w-5" />
             </button>
             <Link href="/patient/profile">
               <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border-2 border-white/40 cursor-pointer hover:bg-white/30 transition-all shadow-xl">
                  <User className="h-6 w-6 text-white" />
               </div>
             </Link>
          </div>
        </div>
      </header>

      <div className="px-6 -mt-16 relative z-20 space-y-8">
        
        {/* --- HERO CARD --- */}
        <div className="rounded-3xl bg-white p-1 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
          <div className="rounded-[20px] border border-slate-100 bg-white overflow-hidden">
            {loading ? (
                <div className="p-10 text-center text-slate-400">Loading your schedule...</div>
            ) : appointment ? (
              <div className="p-0">
                 <div className={`px-6 py-4 flex justify-between items-center ${
                    appointment.status === 'cancelled' ? 'bg-red-900' : 'bg-slate-900'
                 }`}>
                   <div className="flex items-center gap-2 text-white">
                     <span className="relative flex h-3 w-3">
                       <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          appointment.status === 'cancelled' ? 'bg-red-400' : 'bg-green-400'
                       }`}></span>
                       <span className={`relative inline-flex rounded-full h-3 w-3 ${
                          appointment.status === 'cancelled' ? 'bg-red-500' : 'bg-green-500'
                       }`}></span>
                     </span>
                     <span className="text-sm font-bold tracking-wide uppercase">{appointment.status}</span>
                   </div>
                   <div className="text-white/60 text-xs font-mono">ID: #{appointment.id}</div>
                 </div>

                 <div className="p-6">
                   <div className="flex flex-col md:flex-row gap-6 items-center">
                     <div className="flex-1 space-y-2">
                       <h2 className="text-2xl font-bold text-slate-900">{appointment.treatment}</h2>
                       <p className="text-slate-500 font-medium flex items-center gap-2">
                         <User className="h-4 w-4 text-blue-500" /> Dr. {appointment.doctor}
                       </p>
                       <p className="text-slate-400 text-sm flex items-center gap-2">
                          <MapPin className="h-3 w-3" /> {appointment.hospital_name}
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

                     <div className="flex flex-col gap-2 w-full md:w-auto">
                       {appointment.status !== 'cancelled' && (
                         <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-[180px] text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Starts In</p>
                            <div className="flex justify-center gap-2 text-2xl font-mono font-bold text-slate-800">
                              <span>{countdown.h}<span className="text-[10px] text-slate-400 align-top ml-0.5">H</span></span>:
                              <span>{countdown.m}<span className="text-[10px] text-slate-400 align-top ml-0.5">M</span></span>
                            </div>
                         </div>
                       )}
                       
                       <Button onClick={handleNavigate} className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2">
                          <MapPin className="h-4 w-4" /> Get Directions
                       </Button>
                     </div>
                   </div>

                   <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
                      {appointment.status !== 'cancelled' && appointment.status !== 'completed' ? (
                        <>
                          <Link href="/patient/appointments/new" className="flex-1">
                             <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50 font-bold transition-all">
                                <CalendarDays className="mr-2 h-4 w-4"/> Reschedule
                             </Button>
                          </Link>
                          <Button onClick={handleCancel} variant="ghost" className="h-12 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 font-bold transition-all px-6">
                             <XCircle className="mr-2 h-4 w-4"/> Cancel
                          </Button>
                        </>
                      ) : (
                        <div className="w-full text-center text-slate-400 text-sm italic">
                          This appointment is {appointment.status}. <Link href="/patient/appointments/new" className="text-blue-600 underline">Book a new one?</Link>
                        </div>
                      )}
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
                  <Button className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg text-white font-bold transition-transform hover:scale-105">
                    Book Your First Visit
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* --- QUICK ACTIONS --- */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2 px-1">
            <Sparkles className="h-5 w-5 text-yellow-500" /> Quick Actions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             
             {/* 1. NEW BOOKING */}
            <Link href="/patient/appointments/new">
              <div className="group relative h-40 overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-xl shadow-blue-500/20 transition-all hover:shadow-blue-500/40 hover:-translate-y-1 cursor-pointer">
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

            {/* 2. RECORDS */}
            <Link href="/patient/records">
              <div className="group relative h-40 overflow-hidden rounded-[24px] bg-white border border-slate-200 p-6 text-slate-800 shadow-sm transition-all hover:border-purple-500 hover:shadow-md cursor-pointer">
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">My Records</h3>
                    <p className="text-slate-500 text-sm">Prescriptions & X-rays</p>
                  </div>
                </div>
              </div>
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}