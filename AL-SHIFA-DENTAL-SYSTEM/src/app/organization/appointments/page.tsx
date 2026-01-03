"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Stethoscope, Trash2, RefreshCcw, XCircle } from "lucide-react";
import { OrganizationAPI } from "@/lib/api";

export default function OrgAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await OrganizationAPI.getAppointments();
      setAppointments(response.data);
    } catch (error) {
      console.error("Failed to fetch appointments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id: number) => {
    if (!confirm("Are you sure you want to CANCEL this appointment? The patient will be notified.")) return;
    
    try {
      await OrganizationAPI.cancelAppointment(id);
      fetchAppointments(); // Refresh list
    } catch (error) {
      alert("Failed to cancel appointment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Appointments</h1>
          <p className="text-sm text-slate-500">View and manage all patient bookings</p>
        </div>
        <Button variant="outline" onClick={fetchAppointments} className="flex gap-2">
           <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {appointments.length === 0 && !loading ? (
           <Card>
             <CardContent className="p-8 text-center text-slate-500">
               No appointments found for your hospital.
             </CardContent>
           </Card>
        ) : (
          appointments.map((appt) => (
            <Card key={appt.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg 
                  ${appt.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {appt.patient_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{appt.patient_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><User className="h-3 w-3"/> Dr. {appt.doctor_name}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3"/> {appt.treatment}</span>
                  </div>
                  <div className="mt-1 flex gap-2">
                     <span className="flex items-center gap-1 text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                        <Calendar className="h-3 w-3"/> {appt.date}
                     </span>
                     <span className="flex items-center gap-1 text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                        <Clock className="h-3 w-3"/> {appt.time}
                     </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 md:mt-0">
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    appt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                    appt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                    {appt.status}
                </div>
                
                {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                  <Button onClick={() => handleCancel(appt.id)} size="sm" variant="destructive" className="flex gap-2">
                    <XCircle className="h-4 w-4" /> Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}