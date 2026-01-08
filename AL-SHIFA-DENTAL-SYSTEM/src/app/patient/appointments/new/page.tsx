"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, User, RefreshCcw, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { PatientAPI, AuthAPI } from "@/lib/api";

export default function NewBooking() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selHosp, setSelHosp] = useState<any>(null);
  const [selDoc, setSelDoc] = useState<any>(null);
  const [form, setForm] = useState({ date: "", time: "", reason: "" });

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Hospitals (Public)
      const resHosp = await AuthAPI.getVerifiedHospitals();
      setHospitals(resHosp.data);

      // 2. Fetch Doctors (Public)
      const resDocs = await PatientAPI.getDoctors();
      setDoctors(resDocs.data);

    } catch (e: any) {
      console.error("Booking Error:", e);
      let msg = "Failed to load data.";
      if (e.message === "Network Error") msg = "Backend is not running. (Network Error)";
      else if (e.response?.status === 404) msg = "API Endpoint Not Found (404). Did you restart backend?";
      else if (e.response?.status === 500) msg = "Server Error (500). Check backend logs.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selDoc) {
      PatientAPI.getDoctorTreatments(selDoc.id).then(res => setTreatments(res.data));
    }
  }, [selDoc]);

  const submit = async () => {
    try {
      await PatientAPI.bookAppointment({
        doctor_id: selDoc.id,
        date: form.date,
        time: form.time,
        reason: form.reason
      });
      alert("Booked Successfully!");
      router.push("/patient/dashboard");
    } catch (e: any) { alert(e.response?.data?.detail || "Booking failed"); }
  };

  if (loading) return <div className="p-10 text-center">Loading booking system...</div>;
  
  if (error) return (
    <div className="p-10 text-center flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Connection Error</h2>
        <p className="text-red-600 mb-6 bg-red-50 p-3 rounded border border-red-100">{error}</p>
        <Button onClick={fetchData} variant="outline"><RefreshCcw className="mr-2 h-4 w-4"/> Retry Connection</Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pt-10 space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold">Book Appointment</h1>
      
      {step === 1 && (
        <div className="grid gap-4">
          <h2 className="text-lg text-slate-500 font-medium">Select Hospital</h2>
          {hospitals.length === 0 ? <p className="text-slate-400">No verified hospitals found.</p> : hospitals.map(h => (
            <Card key={h.id} className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => { setSelHosp(h); setStep(2); }}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="bg-blue-100 p-2 rounded-lg"><Building2 className="text-blue-600"/></div>
                <div><h3 className="font-bold">{h.name}</h3><p className="text-sm text-slate-500">{h.address}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-black underline mb-2 text-left">Back to Hospitals</button>
          <h2 className="text-lg text-slate-500 font-medium">Select Doctor</h2>
          {doctors.filter(d => d.hospital_id === selHosp.id).length === 0 ? <p className="text-slate-400">No doctors available here.</p> : 
           doctors.filter(d => d.hospital_id === selHosp.id).map(d => (
            <Card key={d.id} className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => { setSelDoc(d); setStep(3); }}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="bg-purple-100 p-2 rounded-lg"><User className="text-purple-600"/></div>
                <div><h3 className="font-bold">{d.full_name}</h3><p className="text-sm text-slate-500">{d.specialization}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <button onClick={() => setStep(2)} className="text-sm text-slate-500 hover:text-black underline">Back to Doctors</button>
            <h2 className="font-bold text-lg mb-4">Finalize Details</h2>
            
            <div>
              <label className="block text-sm font-bold mb-1">Date</label>
              <input type="date" className="w-full border p-2 rounded" onChange={e => setForm({...form, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Time</label>
              <select className="w-full border p-2 rounded" onChange={e => setForm({...form, time: e.target.value})}>
                <option>Select Slot</option>
                {["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Treatment Type</label>
              <select className="w-full border p-2 rounded" onChange={e => setForm({...form, reason: e.target.value})}>
                <option value="">Select Treatment</option>
                {treatments.length > 0 ? treatments.map((t, i) => (
                  <option key={i} value={t.name}>{t.name} (Rs. {t.cost})</option>
                )) : <option>General Checkup</option>}
              </select>
            </div>
            <Button onClick={submit} className="w-full bg-blue-600 hover:bg-blue-700">Confirm Booking</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}