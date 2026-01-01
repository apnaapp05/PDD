"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Building2, MapPin, User, ChevronRight, ArrowLeft, Calendar, Search, Bot, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api"; // API Helper Import

export default function NewAppointment() {
  const router = useRouter();
  const [mode, setMode] = useState<"selection" | "ai" | "manual">("selection");
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [countdown, setCountdown] = useState({ days: 0, hours: 2, mins: 45, secs: 0 });
  
  // Form Data States
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock Data
  const locations = ["Gulberg, Lahore", "DHA Phase 5", "Johar Town", "Model Town"];
  const hospitals = ["City Dental Care", "Al-Shifa Main Branch", "Smile Align Center", "Medicare Dental"];
  const doctors = ["Dr. Sarah Ahmed (Orthodontist)", "Dr. Bilal Karim (Surgeon)", "Dr. Hameed (General)", "Dr. Ayesha (Pediatric)"];

  useEffect(() => {
    setSearchQuery("");
  }, [step]);

  // --- API CALL TO SAVE APPOINTMENT (FIXED) ---
  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    // 1. Get Token (Chabi nikalo)
    const token = localStorage.getItem("token");
    
    if (!token) {
      alert("You are not logged in. Please login first.");
      router.push("/auth/patient/login");
      return;
    }

    try {
      // 2. Send Data WITH Token
      const response = await api.post("/appointments", {
        date: selectedDate, 
        time: selectedTime,
        reason: "Regular Checkup",
      }, {
        headers: {
          Authorization: `Bearer ${token}` // <--- YEH ZAROORI HAI
        }
      });

      // 3. Save for Countdown Display
      const appointmentData = {
        doctor: response.data.doctor_name,
        treatment: "Dental Checkup",
        date: response.data.date,
        time: response.data.time,
        bookedAt: new Date().toISOString()
      };
      localStorage.setItem("latestAppointment", JSON.stringify(appointmentData));

      // 4. Move to Success Screen
      setStep(6);

    } catch (error: any) {
      console.error("Booking Failed", error);
      // Agar error aaye to console mein detail check karein
      if (error.response) {
        alert(`Error: ${error.response.data.detail || "Server Error"}`);
      } else {
        alert("Failed to connect to server.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Countdown Timer
  useEffect(() => {
    if (step === 6) {
      const timer = setInterval(() => {
        setCountdown((prev) => ({ ...prev, secs: prev.secs === 0 ? 59 : prev.secs - 1 }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  // --- COMPONENTS ---
  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button 
      onClick={onClick}
      className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all hover:border-patient hover:text-patient hover:shadow-md active:scale-95"
      aria-label="Go Back"
    >
      <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
    </button>
  );

  const Stepper = () => {
    const steps = ["Loc", "Hosp", "Doc", "Date", "Slot", "Done"];
    
    return (
      <div className="w-full max-w-4xl mx-auto mb-12 px-4">
        <div className="relative flex justify-between items-center">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 -z-10 rounded-full"></div>
          <div 
            className="absolute top-1/2 left-0 h-1 bg-patient -translate-y-1/2 -z-10 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          ></div>

          {steps.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = step > stepNum;
            const isActive = step === stepNum;

            return (
              <div 
                key={idx} 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => step > stepNum && setStep(stepNum)}
              >
                <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 z-10
                  ${isCompleted ? "bg-patient border-patient text-white" : 
                    isActive ? "bg-white border-patient text-patient shadow-[0_0_0_4px_rgba(42,157,143,0.2)]" : 
                    "bg-white border-slate-200 text-slate-300"}`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{stepNum}</span>}
                </div>
                <span className={`absolute mt-12 text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-colors duration-300
                  ${isActive ? "text-patient" : isCompleted ? "text-slate-600" : "text-slate-300"}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- SCREEN 1: SELECTION MODE ---
  if (mode === "selection") {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-5xl space-y-8">
          <div className="text-center space-y-2">
             <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Schedule Your Visit</h1>
             <p className="text-slate-500">Select your preferred booking method</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div onClick={() => setMode("ai")} className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-patient/50 transition-all duration-300">
              <div className="absolute top-0 right-0 bg-gradient-to-bl from-purple-100 to-white px-4 py-2 rounded-bl-xl text-[10px] font-bold text-purple-600 uppercase tracking-wide">Recommended</div>
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-purple-600 transition-transform group-hover:scale-110"><Bot className="h-8 w-8" /></div>
              <h3 className="text-xl font-bold text-slate-900">AI Fast-Track</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">Describe symptoms, get matched instantly.</p>
              <div className="mt-8 flex items-center font-semibold text-purple-600 group-hover:underline">Start Chat <ChevronRight className="ml-1 h-4 w-4" /></div>
            </div>

            <div onClick={() => setMode("manual")} className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-patient/50 transition-all duration-300">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-transform group-hover:scale-110"><Calendar className="h-8 w-8" /></div>
              <h3 className="text-xl font-bold text-slate-900">Manual Booking</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">Browse directory and choose slot manually.</p>
              <div className="mt-8 flex items-center font-semibold text-blue-600 group-hover:underline">Browse Calendar <ChevronRight className="ml-1 h-4 w-4" /></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- SCREEN 2: AI CHAT ---
  if (mode === "ai") {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold mb-4">AI Chat Interface</h2>
        <p className="text-slate-500 mb-6">Coming Soon</p>
        <Button onClick={() => setMode("selection")}>Back to Selection</Button>
      </div>
    );
  }

  // --- SCREEN 3: MANUAL WIZARD ---
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md px-6 py-4 border-b border-slate-100">
        <div className="mx-auto max-w-3xl flex items-center gap-4">
          <BackButton onClick={() => step > 1 ? setStep(step-1) : setMode("selection")} />
          <h1 className="text-lg font-bold text-slate-900">New Appointment</h1>
        </div>
      </div>

      <div className="px-6 pb-20 pt-8">
        <Stepper />

        <div className="mx-auto max-w-2xl">
          {/* SEARCH BAR */}
          {step <= 3 && (
            <div className="relative mb-6 animate-in fade-in slide-in-from-top-2">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder={step === 1 ? "Search Area..." : step === 2 ? "Search Hospital..." : "Search Doctor..."}
                className="w-full h-12 rounded-xl border-none bg-white pl-12 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-patient outline-none text-lg transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* STEP 1: Select Location */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-500">
               <h2 className="text-xl font-bold text-slate-900">Select Location</h2>
               {locations.filter(l => l.toLowerCase().includes(searchQuery.toLowerCase())).map((loc) => (
                 <div key={loc} onClick={() => setStep(2)} className="group flex cursor-pointer items-center gap-5 rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:border-patient hover:shadow-md transition-all">
                   <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-patient group-hover:text-white transition-colors"><MapPin className="h-6 w-6"/></div>
                   <div className="flex-1 font-bold text-lg text-slate-900">{loc}</div>
                   <ChevronRight className="text-slate-300 group-hover:text-patient" />
                 </div>
               ))}
            </div>
          )}

          {/* STEP 2: Select Hospital */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-500">
               <h2 className="text-xl font-bold text-slate-900">Select Hospital</h2>
               {hospitals.filter(h => h.toLowerCase().includes(searchQuery.toLowerCase())).map((h) => (
                 <div key={h} onClick={() => setStep(3)} className="group flex cursor-pointer items-center gap-5 rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:border-patient hover:shadow-md transition-all">
                   <div className="h-14 w-14 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-patient group-hover:text-white transition-colors"><Building2 className="h-7 w-7"/></div>
                   <div className="flex-1"><div className="font-bold text-lg text-slate-900">{h}</div><div className="text-sm text-slate-500">Open 24/7 • 1.2km away</div></div>
                   <ChevronRight className="text-slate-300 group-hover:text-patient" />
                 </div>
               ))}
            </div>
          )}

          {/* STEP 3: Select Doctor */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-500">
               <h2 className="text-xl font-bold text-slate-900">Select Specialist</h2>
               {doctors.filter(d => d.toLowerCase().includes(searchQuery.toLowerCase())).map((d) => (
                 <div key={d} onClick={() => setStep(4)} className="group flex cursor-pointer items-center gap-5 rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all">
                   <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl">{d.split(' ')[1][0]}</div>
                   <div className="flex-1"><div className="font-bold text-lg text-slate-900">{d.split('(')[0]}</div><div className="text-sm text-blue-600 font-medium">{d.split('(')[1].replace(')', '')}</div></div>
                   <ChevronRight className="text-slate-300 group-hover:text-blue-600" />
                 </div>
               ))}
            </div>
          )}

          {/* STEP 4: Date */}
          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500 text-center pt-8">
               <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-4"><Calendar className="h-10 w-10" /></div>
               <h2 className="text-2xl font-bold text-slate-900">Select Date</h2>
               <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
                 <input 
                    type="date" 
                    className="w-full text-center text-xl font-medium text-slate-700 focus:outline-none" 
                    onChange={(e) => setSelectedDate(e.target.value)}
                 />
               </div>
               <Button 
                 className="w-full h-12 text-lg rounded-xl bg-patient hover:bg-patient-dark" 
                 onClick={() => {
                    if(!selectedDate) alert("Please pick a date");
                    else setStep(5);
                 }}
               >
                 Continue
               </Button>
            </div>
          )}

          {/* STEP 5: Slot */}
          {step === 5 && (
             <div className="space-y-6 animate-in slide-in-from-right duration-500">
               <h2 className="text-xl font-bold text-slate-900">Available Slots</h2>
               <div className="grid grid-cols-3 gap-3">
                 {["10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"].map(t => (
                   <button 
                      key={t} 
                      onClick={() => {
                        setSelectedTime(t);
                        handleConfirm();
                      }} 
                      disabled={isSubmitting}
                      className="h-14 rounded-lg border border-slate-200 bg-white font-medium hover:bg-patient hover:text-white hover:border-patient transition-all shadow-sm disabled:opacity-50"
                   >
                     {isSubmitting && selectedTime === t ? <Loader2 className="animate-spin mx-auto"/> : t}
                   </button>
                 ))}
               </div>
             </div>
          )}

          {/* STEP 6: Success */}
          {step === 6 && (
            <div className="text-center animate-in zoom-in duration-500 py-10">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-inner"><Check className="h-12 w-12" /></div>
              <h2 className="text-3xl font-bold text-slate-900">All Set!</h2>
              <p className="text-slate-500 mt-2">Your appointment has been saved to the database.</p>
              
              <div className="mt-8 overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl">
                 <div className="bg-slate-800 p-3 text-xs font-bold uppercase tracking-widest text-slate-400">Starts In</div>
                 <div className="flex justify-center gap-4 py-8">
                   <div className="text-center"><div className="text-3xl font-mono font-bold">{countdown.days}</div><span className="text-[10px] text-slate-500">DAYS</span></div>
                   <div className="text-2xl text-slate-600">:</div>
                   <div className="text-center"><div className="text-3xl font-mono font-bold">{countdown.hours}</div><span className="text-[10px] text-slate-500">HRS</span></div>
                   <div className="text-2xl text-slate-600">:</div>
                   <div className="text-center"><div className="text-3xl font-mono font-bold">{countdown.mins}</div><span className="text-[10px] text-slate-500">MINS</span></div>
                   <div className="text-2xl text-slate-600">:</div>
                   <div className="text-center"><div className="text-3xl font-mono font-bold text-patient">{countdown.secs}</div><span className="text-[10px] text-slate-500">SECS</span></div>
                 </div>
              </div>

              <Button onClick={() => router.push('/patient/dashboard')} variant="ghost" className="mt-8 text-slate-500 hover:text-slate-900">
                <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}