"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DoctorAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, History, Save } from "lucide-react";

export default function PatientTreatmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ diagnosis: "", prescription: "", notes: "" });

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await DoctorAPI.getPatientDetails(id);
        setPatient(res.data);
      } catch (error) {
        alert("Failed to load patient details");
        router.back();
      } finally { setLoading(false); }
    };
    loadData();
  }, [id, router]);

  const handleSubmit = async () => {
    if (!form.diagnosis || !form.prescription) return alert("Please enter a Diagnosis and Prescription");
    
    setSubmitting(true);
    try {
      // 1. Save Medical Record
      await DoctorAPI.addMedicalRecord(id, form);

      // 2. Attempt to Complete Appointment (Triggers Inventory Deduction)
      try {
        // Find latest active appointment for this patient
        const schedule = await DoctorAPI.getSchedule();
        // Look for appointments for this patient that are confirmed
        const activeAppt = schedule.data.find((appt: any) => 
            // Match by name because schedule returns patient_name, or ideally backend returns ID. 
            // For now, we rely on the dashboard logic where doctors handle today's patients.
            // A safer way is to call completeAppointment if we came from a specific appointment ID.
            // Since we are on patient page, we just save record. 
            // To ensure safety, we prompt doctor on Dashboard to click "Complete".
            false 
        );
        
        // NOTE: Inventory deduction happens when clicking "Complete" on the Dashboard.
        // This page is for Medical Records. 
        
      } catch (err) { console.log("Inventory step skipped"); }

      alert("Medical Record Saved!");
      router.push("/doctor/dashboard"); 
    } catch (error) {
      alert("Failed to save record");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-600" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      {/* Patient Header */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
          {patient.full_name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{patient.full_name}</h1>
          <div className="flex gap-4 text-sm text-slate-500 mt-1">
            <span>Age: {patient.age}</span>
            <span>Gender: {patient.gender}</span>
            <span>ID: #{patient.id}</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT: New Consultation */}
        <Card className="border-t-4 border-t-blue-600">
          <CardHeader><CardTitle>Current Consultation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis</label>
              <Input placeholder="e.g. Dental Caries" value={form.diagnosis} onChange={(e) => setForm({...form, diagnosis: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prescription (Rx)</label>
              <textarea className="w-full min-h-[120px] rounded-md border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Amoxicillin 500mg" value={form.prescription} onChange={(e) => setForm({...form, prescription: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Private Notes (Optional)</label>
              <textarea className="w-full min-h-[80px] rounded-md border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-slate-500" placeholder="Internal notes..." value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700">
              {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Medical Record
            </Button>
            <p className="text-xs text-slate-400 text-center mt-2">
                Note: To deduct inventory & generate invoice, please click "Complete" on the Dashboard appointment list.
            </p>
          </CardContent>
        </Card>

        {/* RIGHT: History */}
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader><CardTitle className="flex items-center gap-2 text-slate-700"><History className="h-5 w-5" /> Medical History</CardTitle></CardHeader>
          <CardContent>
            {patient.history.length === 0 ? <p className="text-slate-500 text-sm italic">No previous records found.</p> : (
              <div className="space-y-4">
                {patient.history.map((rec: any) => (
                  <div key={rec.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-900">{rec.date}</span>
                      <span className="text-xs text-slate-500">Dr. {rec.doctor_name}</span>
                    </div>
                    <p className="text-slate-700 mb-1"><strong>Dx:</strong> {rec.diagnosis}</p>
                    <p className="text-slate-600 font-mono text-xs bg-slate-50 p-2 rounded">{rec.prescription}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}