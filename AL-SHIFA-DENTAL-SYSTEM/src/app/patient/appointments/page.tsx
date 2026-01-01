"use client";

import MapLinkButton from "@/components/location/MapLinkButton";
import { Badge } from "@/components/ui/badge"; 
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User2 } from "lucide-react";

export default function PatientAppointments() {
  // Mock Data (Replace with API fetch in production)
  const appts = [
    {
      id: "APT_1",
      doctor: "Dr. John Doe",
      specialization: "Orthodontist",
      hospital: "Al-Shifa Dental Center",
      address: "Road No. 12, Banjara Hills",
      date: "2025-02-10",
      time: "10:20 AM",
      status: "upcoming"
    },
    {
      id: "APT_2",
      doctor: "Dr. Sarah Lee",
      specialization: "General Dentist",
      hospital: "City Care Clinic",
      address: "Jubilee Hills",
      date: "2024-12-15",
      time: "02:00 PM",
      status: "completed"
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold text-slate-900">Your Appointments</h1>
         <Button variant="outline" size="sm">History</Button>
      </div>

      <div className="grid gap-4">
        {appts.map(a => (
          <div key={a.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            
            {/* Info Section */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                 <h3 className="font-bold text-lg text-slate-900">{a.doctor}</h3>
                 <Badge variant={a.status === 'upcoming' ? 'default' : 'secondary'} className={a.status === 'upcoming' ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-gray-100 text-gray-600"}>
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                 </Badge>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                 <User2 className="h-3 w-3" /> {a.specialization}
              </p>
              <div className="flex items-center gap-4 text-sm font-medium text-slate-700 pt-1">
                 <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400"/> {a.date}</span>
                 <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400"/> {a.time}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{a.hospital}</p>
            </div>

            {/* Action Section */}
            <div className="flex items-center gap-3 w-full md:w-auto">
               <MapLinkButton address={`${a.hospital}, ${a.address}`} />
               {a.status === 'upcoming' && (
                  <Button variant="destructive" size="sm" className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-100">
                    Cancel
                  </Button>
               )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}