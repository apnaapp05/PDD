"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { PatientAPI, AuthAPI } from "@/lib/api";

export default function NewBooking() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  
  const [selHosp, setSelHosp] = useState<any>(null);
  const [selDoc, setSelDoc] = useState<any>(null);
  const [form, setForm] = useState({ date: "", time: "", reason: "" });

  useEffect(() => {
    AuthAPI.getVerifiedHospitals().then(res => setHospitals(res.data));
    PatientAPI.getDoctors().then(res => setDoctors(res.data));
  }, []);

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
      alert("Booked!");
      router.push("/patient/dashboard");
    } catch (e: any) { alert(e.response?.data?.detail || "Error"); }
  };

  return (
    <div className="max-w-2xl mx-auto pt-10 space-y-6">
      <h1 className="text-2xl font-bold">Book Appointment</h1>
      
      {step === 1 && (
        <div className="grid gap-4">
          <h2 className="text-lg text-slate-500">Select Hospital</h2>
          {hospitals.map(h => (
            <Card key={h.id} className="cursor-pointer hover:border-blue-500" onClick={() => { setSelHosp(h); setStep(2); }}>
              <CardContent className="p-4 flex items-center gap-4">
                <Building2 className="text-blue-500"/>
                <div><h3 className="font-bold">{h.name}</h3><p className="text-sm">{h.address}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <button onClick={() => setStep(1)} className="text-sm underline mb-2">Back</button>
          <h2 className="text-lg text-slate-500">Select Doctor</h2>
          {doctors.filter(d => d.hospital_id === selHosp.id).map(d => (
            <Card key={d.id} className="cursor-pointer hover:border-blue-500" onClick={() => { setSelDoc(d); setStep(3); }}>
              <CardContent className="p-4 flex items-center gap-4">
                <User className="text-purple-500"/>
                <div><h3 className="font-bold">{d.full_name}</h3><p className="text-sm">{d.specialization}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <button onClick={() => setStep(2)} className="text-sm underline">Back</button>
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
            <Button onClick={submit} className="w-full">Confirm Booking</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}