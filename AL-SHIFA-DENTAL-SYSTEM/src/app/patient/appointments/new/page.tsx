"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, Stethoscope, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PatientAPI, AuthAPI } from "@/lib/api";

export default function NewAppointmentPage() {
  const router = useRouter();
  
  // START directly at hospital selection
  const [mode, setMode] = useState<'hospital_select' | 'doctor_select' | 'booking_form'>('hospital_select');
  const [loading, setLoading] = useState(false);
  
  // Data
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  
  // Selection State
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    reason: "General Consultation"
  });

  // Role Check
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role && role !== "patient") {
      alert(`You are currently logged in as an ${role.toUpperCase()}. Please login as a PATIENT.`);
      router.push("/auth/patient/login");
    }
  }, [router]);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const hospRes = await AuthAPI.getVerifiedHospitals();
        setHospitals(hospRes.data);
        const docRes = await PatientAPI.getDoctors();
        setDoctors(docRes.data);
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBooking = async () => {
    if (!selectedDoctor || !formData.date || !formData.time) {
      alert("Please fill in all details");
      return;
    }
    const selectedDate = new Date(`${formData.date} ${formData.time}`);
    if (selectedDate < new Date()) {
      alert("Cannot book in the past.");
      return;
    }

    try {
      setLoading(true);
      await PatientAPI.bookAppointment({
        doctor_id: selectedDoctor.id,
        date: formData.date,
        time: formData.time,
        reason: formData.reason
      });
      alert("Appointment Booked Successfully!");
      router.push("/patient/dashboard");
    } catch (error: any) {
      alert(error.response?.data?.detail || "Booking failed");
      setLoading(false);
    }
  };
  
  const today = new Date().toISOString().split("T")[0];
  const availableDoctors = doctors.filter(d => d.hospital_id === selectedHospital?.id);

  // --- STEP 1: SELECT HOSPITAL ---
  if (mode === 'hospital_select') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pt-6">
        <h1 className="text-2xl font-bold text-slate-900">Select a Hospital</h1>
        
        {loading ? (
          <div className="text-center py-10">Loading hospitals...</div>
        ) : hospitals.length === 0 ? (
          <div className="text-center py-10 text-slate-500">No verified hospitals found.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {hospitals.map((hosp) => (
              <div 
                key={hosp.id}
                onClick={() => { setSelectedHospital(hosp); setMode('doctor_select'); }}
                className="group cursor-pointer bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex items-start gap-4"
              >
                <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-700">{hosp.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {hosp.address}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- STEP 2: SELECT DOCTOR ---
  if (mode === 'doctor_select') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pt-6">
        <button onClick={() => setMode('hospital_select')} className="text-sm text-slate-500 hover:underline mb-4">← Back to Hospitals</button>
        
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Select a Doctor</h1>
          <p className="text-slate-500">at <span className="font-semibold text-slate-700">{selectedHospital.name}</span></p>
        </div>
        
        {availableDoctors.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl">
             <Stethoscope className="h-10 w-10 text-slate-300 mx-auto mb-3" />
             <p className="text-slate-500">No verified doctors available at this hospital yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {availableDoctors.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => { setSelectedDoctor(doc); setMode('booking_form'); }}
                className="group cursor-pointer bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex items-start gap-4"
              >
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {doc.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-700">{doc.full_name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" /> {doc.specialization}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- STEP 3: BOOKING FORM ---
  return (
    <div className="max-w-xl mx-auto space-y-6 pt-6">
      <button onClick={() => setMode('doctor_select')} className="text-sm text-slate-500 hover:underline">← Back to Doctors</button>
      
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Book Appointment</h2>
            <div className="mt-2 text-sm text-slate-600 space-y-1">
               <p className="flex items-center gap-2"><User className="h-3 w-3" /> Dr. {selectedDoctor.full_name}</p>
               <p className="flex items-center gap-2"><Building2 className="h-3 w-3" /> {selectedHospital.name}</p>
               <p className="flex items-center gap-2 text-slate-500"><MapPin className="h-3 w-3" /> {selectedHospital.address}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input type="date" min={today} className="w-full pl-10 h-10 rounded-md border border-slate-200 text-sm"
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <select className="w-full pl-10 h-10 rounded-md border border-slate-200 text-sm bg-white"
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                >
                  <option value="">Select Time</option>
                  {["09:00 AM","10:00 AM","11:00 AM","12:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
               <label className="block text-sm font-medium mb-1">Reason for Visit</label>
               <select className="w-full h-10 rounded-md border border-slate-200 text-sm px-3 bg-white"
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  value={formData.reason}
                >
                  <option>General Consultation</option>
                  <option>Tooth Pain</option>
                  <option>Cleaning / Whitening</option>
                  <option>Root Canal</option>
                  <option>Follow-up</option>
                </select>
            </div>
          </div>

          <Button onClick={handleBooking} className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? "Booking..." : "Confirm Appointment"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}