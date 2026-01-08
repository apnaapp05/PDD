"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalIcon, Clock, CheckCircle2, PlayCircle, User, MapPin, Loader2, AlertCircle } from "lucide-react";
import { DoctorAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function SchedulePage() {
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedule = async () => {
    try {
      const res = await DoctorAPI.getSchedule();
      setAppts(res.data);
    } catch (error) {
      console.error("Schedule error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleStart = async (id: number) => {
    try {
      await DoctorAPI.startAppointment(id);
      fetchSchedule(); 
    } catch (e) { alert("Failed to start appointment."); }
  };

  const handleComplete = async (id: number) => {
    if(!confirm("Mark as Complete? This will generate the invoice and deduct inventory.")) return;
    try {
        await DoctorAPI.completeAppointment(id);
        fetchSchedule();
    } catch(e) { alert("Error completing appointment."); }
  };

  if (loading) return (
    <div className="flex h-96 items-center justify-center text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Schedule...
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
          <p className="text-sm text-slate-500">Manage your patient appointments</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm">
          {appts.length} Appointments
        </div>
      </div>

      <div className="grid gap-4">
        {appts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
            <CalIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">No appointments scheduled for today.</p>
          </div>
        ) : (
          appts.map((a: any) => (
            <Card key={a.id} className="group hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-600">
              <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                {/* Patient Info */}
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${
                    a.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                  }`}>
                    {a.patient_name ? a.patient_name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{a.patient_name || "Unknown Patient"}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded text-slate-600">
                        <User className="h-3 w-3" /> {a.type || "General Visit"}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalIcon className="h-3 w-3" /> {a.date}
                      </span>
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <Clock className="h-3 w-3" /> {a.time}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {a.status === 'confirmed' && (
                    <Button onClick={() => handleStart(a.id)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                      <PlayCircle className="h-4 w-4 mr-2" /> Start Visit
                    </Button>
                  )}
                  
                  {a.status === 'in_progress' && (
                    <div className="flex items-center gap-3">
                      <span className="animate-pulse text-orange-600 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                        IN PROGRESS
                      </span>
                      <Button onClick={() => handleComplete(a.id)} className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Complete
                      </Button>
                    </div>
                  )}

                  {a.status === 'completed' && (
                    <span className="flex items-center text-green-700 font-bold text-sm bg-green-50 px-4 py-2 rounded-full border border-green-100">
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Completed
                    </span>
                  )}

                  {a.status === 'cancelled' && (
                    <span className="flex items-center text-red-500 font-bold text-sm bg-red-50 px-4 py-2 rounded-full border border-red-100">
                      <AlertCircle className="h-4 w-4 mr-2" /> Cancelled
                    </span>
                  )}
                </div>

              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}