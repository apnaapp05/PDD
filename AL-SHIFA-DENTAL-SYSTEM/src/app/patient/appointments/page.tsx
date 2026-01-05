"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, User, Plus, Bot, Sparkles, CalendarDays, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PatientAPI } from "@/lib/api";

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppts = async () => {
    try {
      const res = await PatientAPI.getMyAppointments();
      setAppointments(res.data);
    } catch (error) {
      console.error("Failed to load appointments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppts();
  }, []);

  const handleCancel = async (id: number) => {
    if (!confirm("Are you sure you want to CANCEL this appointment? This action cannot be undone.")) return;
    
    try {
      await PatientAPI.cancelAppointment(id);
      fetchAppts(); // Refresh list to show updated status
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to cancel appointment");
    }
  };

  return (
    <div className="space-y-8">
      
      {/* --- Header & Actions --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
          <p className="text-slate-500 text-sm">Manage your visits and history</p>
        </div>
      </div>

      {/* --- Booking Options --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Booking Option */}
        <div 
          onClick={() => alert("AI Agent Integration coming next!")}
          className="cursor-pointer group relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-lg transition-all hover:shadow-indigo-500/30 hover:-translate-y-1"
        >
          <div className="absolute right-0 top-0 h-full w-32 bg-white/10 skew-x-12 -mr-8"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                Book with AI <Sparkles className="h-3 w-3 text-yellow-300" />
              </h3>
              <p className="text-indigo-100 text-sm">Chat to find the perfect slot</p>
            </div>
          </div>
        </div>

        {/* Manual Booking Option */}
        <Link href="/patient/appointments/new">
          <div className="h-full cursor-pointer group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 text-slate-800 shadow-sm transition-all hover:border-blue-500 hover:shadow-md">
            <div className="relative z-10 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Manual Booking</h3>
                <p className="text-slate-500 text-sm">Select doctor from list</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* --- Appointments List --- */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Upcoming Visits</h2>
        
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading your schedule...</div>
        ) : appointments.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
               <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                 <Calendar className="h-8 w-8 text-slate-300" />
               </div>
               <p className="text-slate-500">You have no upcoming appointments.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {appointments.map((appt) => (
              <Card key={appt.id} className="hover:shadow-md transition-shadow border-slate-200">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold 
                      ${appt.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {appt.doctor.charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 text-lg">{appt.treatment}</h3>
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <User className="h-3 w-3" /> Dr. {appt.doctor}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-slate-50 px-3 py-1.5 rounded-md flex items-center gap-2 text-sm text-slate-700 border border-slate-100">
                      <Calendar className="h-3 w-3 text-slate-400" /> {appt.date}
                    </div>
                    <div className="bg-slate-50 px-3 py-1.5 rounded-md flex items-center gap-2 text-sm text-slate-700 border border-slate-100">
                      <Clock className="h-3 w-3 text-slate-400" /> {appt.time}
                    </div>
                    <div className={`px-3 py-1.5 rounded-md text-sm font-bold uppercase tracking-wider ${
                      appt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                      appt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {appt.status}
                    </div>

                    {/* CANCEL BUTTON */}
                    {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                      <Button onClick={() => handleCancel(appt.id)} size="sm" variant="destructive" className="flex gap-2">
                        <XCircle className="h-4 w-4" /> Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}