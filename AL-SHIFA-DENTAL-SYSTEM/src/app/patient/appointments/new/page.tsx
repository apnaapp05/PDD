"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

// UI Components
import { Button } from "@/components/ui/button";
import MapLinkButton from "@/components/location/MapLinkButton"; 
import { 
  Check, Building2, MapPin, ChevronRight, ArrowLeft, Calendar, 
  Search, Bot, Loader2, Send, AlertTriangle 
} from "lucide-react";

export default function NewAppointment() {
  const router = useRouter();
  
  // --- GLOBAL STATES ---
  const [mode, setMode] = useState<"selection" | "ai" | "manual">("selection");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- MANUAL FLOW STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [doctorList, setDoctorList] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  // Selection Data
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // --- AI CHAT STATES ---
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "agent", text: string, isUrgent?: boolean }[]>([
    { role: "agent", text: "Salam! I am Dr. AI. Please describe your symptoms (e.g., 'Sharp pain in lower molar')." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await api.get("/doctors");
        setDoctorList(response.data);
      } catch (error) {
        console.error("Failed to load doctors", error);
        // Fallback for demo
        setDoctorList([
          { id: 1, full_name: "Dr. Ayesha Siddiqui", specialization: "Orthodontist", hospital_name: "Al-Shifa Dental", location: "Banjara Hills" },
          { id: 2, full_name: "Dr. Rahul Verma", specialization: "Oral Surgeon", hospital_name: "City Care", location: "Jubilee Hills" }
        ]);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDoctors();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // --- DERIVED LISTS (Manual Mode) ---
  const locations = [...new Set(doctorList.map(d => d.location))]; 
  const hospitals = [...new Set(doctorList.filter(d => !selectedLocation || d.location === selectedLocation).map(d => d.hospital_name))];
  const filteredDoctors = doctorList.filter(d => 
    (!selectedLocation || d.location === selectedLocation) &&
    (!selectedHospital || d.hospital_name === selectedHospital) &&
    (d.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || d.specialization.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // --- ACTION: BOOK APPOINTMENT ---
  const handleConfirm = async () => {
    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    
    if (!token) {
      alert("Please login first."); // Replace with proper auth redirect
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post("/appointments", {
        doctor_id: selectedDoctor.id, 
        date: selectedDate, 
        time: selectedTime,
        reason: "Regular Checkup (Manual Booking)",
      });

      // Advance to Success Screen
      setStep(6);

    } catch (error: any) {
      console.error(error);
      alert("Booking failed. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTION: AI CHAT ---
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);

    try {
      const response = await api.post("/agent/appointment", {
        user_query: userMsg,
        session_id: "PATIENT_SESSION" 
      });

      const agentData = response.data;
      const isUrgent = agentData.action_taken === "triaged";

      setChatMessages(prev => [...prev, { 
        role: "agent", 
        text: agentData.response_text,
        isUrgent: isUrgent
      }]);

    } catch (error) {
      setChatMessages(prev => [...prev, { role: "agent", text: "I'm having trouble connecting to the clinic server. Please try manual booking." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- COMPONENT: NAV ---
  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="group flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:border-blue-600 hover:text-blue-600 transition-colors">
      <ArrowLeft className="h-4 w-4" />
    </button>
  );

  // --- COMPONENT: STEPPER ---
  const Stepper = () => (
    <div className="w-full max-w-4xl mx-auto mb-10 px-4 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 rounded-full"></div>
        <div className="absolute top-1/2 left-0 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-500 ease-out" style={{ width: `${((step - 1) / 5) * 100}%` }}></div>
        <div className="flex justify-between">
          {["Loc", "Hosp", "Doc", "Date", "Slot", "Done"].map((label, idx) => {
             const isCompleted = step > idx + 1;
             const isCurrent = step === idx + 1;
             return (
                <div key={idx} className={`flex flex-col items-center gap-1 ${isCompleted || isCurrent ? "text-blue-600" : "text-slate-300"}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 bg-white transition-all ${isCurrent ? "border-blue-600 text-blue-600 scale-110 shadow-md" : isCompleted ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200"}`}>
                    {isCompleted ? <Check className="h-4 w-4"/> : <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  <span className="text-[10px] font-medium hidden sm:block uppercase tracking-wider">{label}</span>
                </div>
             );
          })}
        </div>
    </div>
  );

  // VIEW 1: MODE SELECTION
  if (mode === "selection") {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900">Book an Appointment</h1>
            <p className="text-slate-500 mt-2">Choose how you would like to schedule your visit.</p>
        </div>
        
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-6">
           <div onClick={() => setMode("ai")} className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl cursor-pointer border border-slate-200 hover:border-purple-500 transition-all text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg">RECOMMENDED</div>
             <Bot className="h-14 w-14 mx-auto text-purple-600 mb-6 group-hover:scale-110 transition-transform" />
             <h3 className="text-xl font-bold text-slate-900">AI Symptom Match</h3>
             <p className="text-sm text-slate-500 mt-2">Describe your symptoms. Our Agent will triage urgency and find the perfect specialist.</p>
           </div>

           <div onClick={() => setMode("manual")} className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl cursor-pointer border border-slate-200 hover:border-blue-500 transition-all text-center">
             <Calendar className="h-14 w-14 mx-auto text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
             <h3 className="text-xl font-bold text-slate-900">Manual Booking</h3>
             <p className="text-sm text-slate-500 mt-2">Browse hospitals, filter by location, and pick your preferred time slot.</p>
           </div>
        </div>
      </div>
    );
  }

  // VIEW 2: AI CHAT
  if (mode === "ai") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex items-center gap-4 shadow-sm">
          <BackButton onClick={() => setMode("selection")} />
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-600" /> Dr. AI Assistant
            </h2>
            <p className="text-xs text-slate-500">Powered by Al-Shifa Neural Engine</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatScrollRef}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === "user" 
                  ? "bg-blue-600 text-white rounded-br-none" 
                  : msg.isUrgent 
                    ? "bg-red-50 text-red-800 border border-red-200 rounded-bl-none" 
                    : "bg-white text-slate-700 border border-slate-200 rounded-bl-none"
              }`}>
                {msg.isUrgent && (
                  <div className="flex items-center gap-2 font-bold mb-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" /> URGENCY DETECTED
                  </div>
                )}
                {msg.text}
              </div>
            </div>
          ))}
          {chatLoading && (
             <div className="flex justify-start">
               <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm">
                 <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
               </div>
             </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="Type your symptoms..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
            />
            <Button onClick={handleChatSend} className="h-auto w-12 rounded-xl bg-purple-600 hover:bg-purple-700" disabled={chatLoading}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 3: MANUAL WIZARD
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-sm px-6 py-4 border-b">
        <div className="max-w-3xl mx-auto flex gap-4 items-center">
          <BackButton onClick={() => step > 1 ? setStep(step-1) : setMode("selection")} />
          <h1 className="text-lg font-bold">New Appointment</h1>
        </div>
      </div>

      <div className="px-6 py-8">
        <Stepper />
        <div className="max-w-2xl mx-auto min-h-[50vh]">
          
          {/* STEP 1: LOCATION */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right fade-in">
               <h2 className="text-xl font-bold">Select Location</h2>
               {locations.length === 0 ? <p className="text-slate-500">No locations found.</p> : locations.map((loc: any) => (
                 <div key={loc} onClick={() => { setSelectedLocation(loc); setStep(2); }} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-blue-500 cursor-pointer transition-all">
                   <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><MapPin className="h-5 w-5"/></div>
                   <span className="font-semibold text-slate-700 flex-1">{loc}</span>
                   <ChevronRight className="text-slate-300"/>
                 </div>
               ))}
            </div>
          )}

          {/* STEP 2: HOSPITAL */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right fade-in">
               <h2 className="text-xl font-bold">Select Hospital</h2>
               {hospitals.map((h: any) => (
                 <div key={h} onClick={() => { setSelectedHospital(h); setStep(3); }} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-blue-500 cursor-pointer transition-all">
                   <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center"><Building2 className="h-5 w-5"/></div>
                   <span className="font-semibold text-slate-700 flex-1">{h}</span>
                   <ChevronRight className="text-slate-300"/>
                 </div>
               ))}
            </div>
          )}

          {/* STEP 3: DOCTOR */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right fade-in">
               <h2 className="text-xl font-bold">Select Specialist</h2>
               
               <div className="relative mb-4">
                 <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Search doctor name..." 
                   className="w-full pl-10 p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>

               {loadingDocs ? <div className="text-center py-10"><Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-500"/></div> : 
                filteredDoctors.length === 0 ? <div className="text-center p-4 text-slate-500">No doctors match your filters.</div> :
                filteredDoctors.map((d) => (
                  <div key={d.id} onClick={() => { setSelectedDoctor(d); setStep(4); }} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-blue-500 cursor-pointer group transition-all">
                    <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">
                      {d.full_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-lg text-slate-900">{d.full_name}</div>
                      <div className="text-sm text-blue-600 font-medium">{d.specialization}</div>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-blue-600"/>
                  </div>
               ))}
            </div>
          )}

          {/* STEP 4: DATE */}
          {step === 4 && (
            <div className="text-center space-y-6 animate-in slide-in-from-right fade-in pt-4">
               <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600"><Calendar className="h-10 w-10"/></div>
               <h2 className="text-2xl font-bold text-slate-900">Pick a Date</h2>
               <input 
                  type="date" 
                  className="w-full p-4 text-xl text-center border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" 
                  onChange={(e) => setSelectedDate(e.target.value)} 
               />
               <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200" onClick={() => selectedDate ? setStep(5) : alert("Please select a date.")}>
                  Continue
               </Button>
            </div>
          )}

          {/* STEP 5: SLOT */}
          {step === 5 && (
             <div className="space-y-6 animate-in slide-in-from-right fade-in">
               <h2 className="text-xl font-bold">Select Time Slot</h2>
               <div className="grid grid-cols-3 gap-3">
                 {["10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"].map(t => (
                   <button 
                     key={t} 
                     disabled={isSubmitting} 
                     onClick={() => { setSelectedTime(t); handleConfirm(); }} 
                     className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all font-medium disabled:opacity-50 shadow-sm"
                   >
                     {isSubmitting && selectedTime === t ? <Loader2 className="animate-spin mx-auto h-5 w-5"/> : t}
                   </button>
                 ))}
               </div>
             </div>
          )}

          {/* STEP 6: SUCCESS (MERGED MAP BUTTON) */}
          {step === 6 && (
            <div className="text-center py-6 animate-in zoom-in duration-500">
              <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-inner">
                 <Check className="h-12 w-12"/>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">Appointment Confirmed!</h2>
              <p className="text-slate-500 mt-2">Your visit ID is <span className="font-mono text-slate-700">#APT-{Math.floor(Math.random() * 10000)}</span></p>

              <div className="mt-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left space-y-4">
                 <div className="flex justify-between items-center border-b pb-4">
                    <div>
                       <p className="text-xs text-slate-500 uppercase">Specialist</p>
                       <p className="font-bold text-slate-900">{selectedDoctor?.full_name}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs text-slate-500 uppercase">Date & Time</p>
                       <p className="font-bold text-slate-900">{selectedDate} at {selectedTime}</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center justify-between pt-2">
                    <div>
                       <p className="text-xs text-slate-500 uppercase">Hospital</p>
                       <p className="font-medium text-slate-900">{selectedHospital}</p>
                    </div>
                    <MapLinkButton address={`${selectedHospital}, ${selectedLocation}`} />
                 </div>
              </div>

              <div className="mt-8 grid gap-3">
                 <Button onClick={() => router.push('/patient/dashboard')} variant="default" className="w-full bg-slate-900">Go to Dashboard</Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}