"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, Stethoscope, Bot, ArrowRight, CalendarDays, Sparkles, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PatientAPI, AuthAPI } from "@/lib/api";

export default function NewAppointmentPage() {
  const router = useRouter();
  
  // Modes: 'selection' -> 'hospital_select' -> 'doctor_select' -> 'booking_form'
  const [mode, setMode] = useState<'selection' | 'hospital_select' | 'doctor_select' | 'booking_form'>('selection');
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

  // --- NEW: ROLE CHECK ---
  useEffect(() => {
    const role = localStorage.getItem("role");
    // If logged in but not a patient
    if (role && role !== "patient") {
      alert(`You are currently logged in as an ${role.toUpperCase()}. \n\nPlease logout and login as a PATIENT to book appointments.`);
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      router.push("/auth/patient/login");
    }
  }, [router]);

  // Fetch Hospitals on Load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Verified Hospitals
        const hospRes = await AuthAPI.getVerifiedHospitals();
        setHospitals(hospRes.data);
        
        // Fetch All Doctors
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
    const now = new Date();
    if (selectedDate < now) {
      alert("You cannot book an appointment in the past.");
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
      // Handle "Only patients can book" error gracefully
      const msg = error.response?.data?.detail || "Booking failed";
      alert(msg);
      if (msg === "Only patients can book") {
         router.push("/auth/role-selection");
      }
      setLoading(false);
    }
  };
  
  const today = new Date().toISOString().split("T")[0];

  // Filter doctors based on selected hospital
  const availableDoctors = doctors.filter(d => d.hospital_id === selectedHospital?.id);

  // --- MODE 0: SELECTION SCREEN ---
  if (mode === 'selection') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">How would you like to book?</h1>
          <p className="text-slate-500">Choose the most convenient way for you.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div 
            onClick={() => alert("AI Agent Integration coming next!")}
            className="group cursor-pointer relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  Book with AI <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                </h3>
                <p className="text-indigo-100 mt-2">Chat with our intelligent assistant to find the perfect slot in seconds.</p>
              </div>
              <div className="flex items-center text-sm font-bold uppercase tracking-wider opacity-80 group-hover:opacity-100">
                Start Chat <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          <div 
            onClick={() => setMode('hospital_select')}
            className="group cursor-pointer relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 text-slate-900 shadow-sm transition-all hover:scale-[1.02] hover:border-blue-500 hover:shadow-xl"
          >
            <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <CalendarDays className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Manual Booking</h3>
                <p className="text-slate-500 mt-2">Browse hospitals, choose a doctor, and pick your time.</p>
              </div>
              <div className="flex items-center text-sm font-bold uppercase tracking-wider text-blue-600">
                Start Booking <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MODE 1: SELECT HOSPITAL ---
  if (mode === 'hospital_select') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button onClick={() => setMode('selection')} className="text-sm text-slate-500 hover:underline mb-4">← Back</button>
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

  // --- MODE 2: SELECT DOCTOR ---
  if (mode === 'doctor_select') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
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

  // --- MODE 3: BOOKING FORM ---
  return (
    <div className="max-w-xl mx-auto space-y-6">
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
                <input 
                  type="date" 
                  min={today}
                  className="w-full pl-10 h-10 rounded-md border border-slate-200 text-sm"
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <select 
                  className="w-full pl-10 h-10 rounded-md border border-slate-200 text-sm bg-white"
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                >
                  <option value="">Select Time</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                </select>
              </div>
            </div>
            
            <div>
               <label className="block text-sm font-medium mb-1">Reason for Visit</label>
               <select 
                  className="w-full h-10 rounded-md border border-slate-200 text-sm px-3 bg-white"
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