"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, Clock, Loader2, RefreshCcw, Lock, X } from "lucide-react";
import { DoctorAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import SmartAssistant from "@/components/chat/SmartAssistant";

export default function SchedulePage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Block Slot State
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockData, setBlockData] = useState({ date: "", time: "09:00 AM", reason: "Unavailable", is_whole_day: false });

  const timeSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"];

  const fetchSchedule = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) return router.push("/auth/doctor/login");

    try {
      const response = await DoctorAPI.getSchedule();
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

  const handleBlockSlot = async () => {
    if (!blockData.date) {
      alert("Please select date");
      return;
    }
    if (!blockData.is_whole_day && !blockData.time) {
      alert("Please select time or check Whole Day");
      return;
    }
    
    try {
      await DoctorAPI.blockSlot(blockData);
      alert("Slot blocked successfully");
      setShowBlockForm(false);
      setBlockData({ date: "", time: "09:00 AM", reason: "Unavailable", is_whole_day: false });
      fetchSchedule(); // Refresh grid
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to block slot");
    }
  };

  const getApptForSlot = (time: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    return appointments.find(a => {
      const isExactMatch = a.date === todayStr && a.time === time;
      const isWholeDay = a.status === 'blocked' && a.date === todayStr && a.type === "Full Day Leave";
      return isExactMatch || isWholeDay;
    });
  };

  // --- PREPARE CONTEXT FOR AI ---
  const today = new Date().toISOString().split('T')[0];
  const scheduleContext = {
    today_date: today,
    total_appointments: appointments.length,
    today_count: appointments.filter(a => a.date === today && a.status !== 'blocked').length,
    blocked_slots: appointments.filter(a => a.status === 'blocked').length,
    upcoming_summary: appointments
        .filter(a => new Date(a.date) > new Date())
        .slice(0, 5)
        .map(a => `${a.date} ${a.time}: ${a.patient_name} (${a.type})`)
  };

  return (
    <div className="space-y-6 relative animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Weekly Schedule</h1>
        <div className="flex gap-2">
            <Button variant="outline" onClick={fetchSchedule} disabled={loading}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            
            <Button 
              onClick={() => setShowBlockForm(!showBlockForm)} 
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              {showBlockForm ? <X className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />} 
              {showBlockForm ? "Close" : "Block Slot"}
            </Button>
        </div>
      </div>

      {/* Block Slot Form Overlay */}
      {showBlockForm && (
        <Card className="bg-slate-50 border-2 border-red-100 mb-6 animate-in slide-in-from-top-4">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-1/3">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Date</label>
                <Input type="date" value={blockData.date} onChange={(e) => setBlockData({...blockData, date: e.target.value})} />
              </div>
              
              {!blockData.is_whole_day && (
                <div className="w-full md:w-1/3">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Time</label>
                  <select 
                    className="w-full h-10 rounded-md border border-slate-300 px-3 bg-white text-sm"
                    value={blockData.time}
                    onChange={(e) => setBlockData({...blockData, time: e.target.value})}
                  >
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              <div className="w-full md:w-1/3">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Reason</label>
                <Input value={blockData.reason} onChange={(e) => setBlockData({...blockData, reason: e.target.value})} placeholder="Meeting, Leave, etc." />
              </div>
            </div>

            <div className="flex items-center justify-between">
               <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={blockData.is_whole_day} 
                    onChange={(e) => setBlockData({...blockData, is_whole_day: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500" 
                  />
                  <span className="text-sm font-bold text-slate-700">Block Whole Day (Leave)</span>
               </label>

               <Button onClick={handleBlockSlot} className="bg-slate-900 hover:bg-slate-800 text-white">
                 Confirm Block
               </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Agenda */}
        <Card className="lg:col-span-2">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" /> Today's Timeline
            </CardTitle>
            </CardHeader>
            <CardContent>
            {loading ? (
                <div className="py-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600"/></div>
            ) : (
                <div className="space-y-2">
                {timeSlots.map((time) => {
                    const appt = getApptForSlot(time);
                    const isBlocked = appt?.status === 'blocked';
                    
                    return (
                    <div key={time} className="flex border-b border-slate-100 last:border-0 min-h-[4rem] group hover:bg-slate-50 transition-colors">
                        <div className="w-28 border-r border-slate-100 p-4 text-sm text-slate-500 font-mono flex items-center justify-center bg-slate-50/50">
                        {time}
                        </div>
                        <div className="flex-1 p-2">
                        {appt ? (
                            <div className={`border-l-4 p-2 rounded-r-md text-sm w-full h-full flex flex-col justify-center ${
                                isBlocked 
                                ? 'bg-slate-100 border-slate-500 text-slate-600' 
                                : 'bg-blue-100 border-blue-500'
                            }`}>
                                <div className="flex justify-between items-center">
                                    <span className={`font-bold ${isBlocked ? 'text-slate-800' : 'text-blue-900'}`}>
                                      {isBlocked ? (appt.type === "Full Day Leave" ? "🏖️ Full Day Leave" : "⛔ Blocked") : appt.type}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                      isBlocked ? 'bg-slate-200 text-slate-700' : 
                                      appt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-white/60 text-blue-700'
                                    }`}>
                                      {appt.status}
                                    </span>
                                </div>
                                <div className="text-xs flex items-center gap-1 mt-1">
                                    <span className="font-medium">
                                      {isBlocked ? `Reason: ${appt.notes}` : appt.patient_name}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-start pl-4">
                              <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Available</span>
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
                    {appointments.filter(a => new Date(a.date) > new Date()).length === 0 && !loading && (
                        <p className="text-slate-500 text-sm">No upcoming appointments.</p>
                    )}
                    {appointments
                        .filter(a => new Date(a.date) > new Date()) // Future dates
                        .slice(0, 5)
                        .map((appt: any) => (
                        <div key={appt.id} className="flex gap-3 items-start border-b border-slate-100 pb-3 last:border-0">
                            <div className="bg-slate-100 p-2 rounded-lg text-center min-w-[50px]">
                                <span className="block text-xs text-slate-500 font-bold uppercase">{new Date(appt.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                <span className="block text-lg font-bold text-slate-800">{new Date(appt.date).getDate()}</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">
                                    {appt.status === 'blocked' ? (appt.type === "Full Day Leave" ? "Full Day Leave" : "Blocked Slot") : appt.patient_name}
                                </p>
                                <p className="text-xs text-slate-500">{appt.type}</p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 font-medium">
                                    <Clock className="h-3 w-3" /> {appt.time}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* 🟣 SMART ASSISTANT WITH SCHEDULE CONTEXT */}
      <SmartAssistant 
        role="doctor" 
        pageName="Schedule" 
        pageContext={scheduleContext} 
      />
    </div>
  );
}