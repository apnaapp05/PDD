"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Calendar, User, Stethoscope } from "lucide-react";
import { PatientAPI } from "@/lib/api";

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await PatientAPI.getMyRecords();
        setRecords(res.data);
      } catch (error) {
        console.error("Failed to load records", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Medical Records</h1>
        <p className="text-sm text-slate-500">Your history of diagnoses and prescriptions</p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-500">Loading records...</div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
             <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
               <FileText className="h-8 w-8 text-slate-300" />
             </div>
             <p className="text-slate-500">No medical records found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => (
            <Card key={rec.id} className="overflow-hidden border border-slate-200">
              <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {new Date(rec.date).toLocaleDateString()}
                </div>
                <div className="text-xs text-slate-500">
                  Dr. {rec.doctor_name} • {rec.hospital_name}
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Diagnosis</h4>
                  <p className="text-slate-800 font-medium">{rec.diagnosis}</p>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" /> Prescription
                  </h4>
                  <p className="text-sm text-blue-900 font-mono whitespace-pre-wrap">{rec.prescription}</p>
                </div>

                {rec.notes && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</h4>
                    <p className="text-xs text-slate-600">{rec.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}