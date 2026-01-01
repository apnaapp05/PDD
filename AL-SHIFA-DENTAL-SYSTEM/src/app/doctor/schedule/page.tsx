"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, Loader2, RefreshCcw } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function SchedulePage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Time slots for the daily view grid
  const timeSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"];

  const fetchSchedule = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) return router.push("/auth/doctor/login");

    try {
      const response = await api.get("/doctor/schedule", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data);
    } catch (error) {
      console.error("Failed to load schedule", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Helper to find appointment for a specific time slot
  const getApptForSlot = (time: string) => {
    // Simple string matching for now (e.g., "10:00 AM" matches "10:00")
    return appointments.find(a => a.time.includes(time.split(" ")[0])); // simplistic match
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Weekly Schedule</h1>
        <div className="flex gap-2">
            <Button variant="outline" onClick={fetchSchedule} disabled={loading}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="doctor">
            <Plus className="mr-2 h-4 w-4" /> Block Slot
            </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Agenda */}
        <Card className="lg:col-span-2">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-doctor" /> Today's Timeline
            </CardTitle>
            </CardHeader>
            <CardContent>
            {loading ? (
                <div className="py-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-doctor"/></div>
            ) : (
                <div className="space-y-2">
                {timeSlots.map((time) => {
                    const appt = getApptForSlot(time);
                    return (
                    <div key={time} className="flex border-b border-slate-100 last:border-0 min-h-[4rem] group hover:bg-slate-50 transition-colors">
                        <div className="w-28 border-r border-slate-100 p-4 text-sm text-slate-500 font-mono flex items-center justify-center bg-slate-50/50">
                        {time}
                        </div>
                        <div className="flex-1 p-2">
                        {appt ? (
                            <div className="bg-blue-100 border-l-4 border-blue-500 p-2 rounded-r-md text-sm w-full h-full flex flex-col justify-center">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-blue-900">{appt.type}</span>
                                    <span className="text-[10px] bg-white/60 px-2 py-0.5 rounded text-blue-700 font-bold uppercase">{appt.status}</span>
                                </div>
                                <div className="text-blue-700 text-xs flex items-center gap-1 mt-1">
                                    <span className="font-medium">{appt.patient_name}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-start pl-4">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-doctor text-xs">+ Add Appointment</Button>
                            </div>
                        )}
                        </div>
                    </div>
                    );
                })}
                </div>
            )}
            </CardContent>
        </Card>

        {/* Upcoming List */}
        <Card>
            <CardHeader>
                <CardTitle>Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {appointments.length === 0 && !loading && <p className="text-slate-500 text-sm">No upcoming appointments.</p>}
                    {appointments.slice(0, 5).map((appt: any) => (
                        <div key={appt.id} className="flex gap-3 items-start border-b border-slate-100 pb-3 last:border-0">
                            <div className="bg-slate-100 p-2 rounded-lg text-center min-w-[50px]">
                                <span className="block text-xs text-slate-500 font-bold uppercase">{new Date(appt.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                <span className="block text-lg font-bold text-slate-800">{new Date(appt.date).getDate()}</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">{appt.patient_name}</p>
                                <p className="text-xs text-slate-500">{appt.type}</p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-doctor font-medium">
                                    <Clock className="h-3 w-3" /> {appt.time}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}