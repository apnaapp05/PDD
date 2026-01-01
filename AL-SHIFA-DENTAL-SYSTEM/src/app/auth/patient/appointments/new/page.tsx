"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, User, CheckCircle, Building2, Bot, ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function NewAppointment() {
  const [mode, setMode] = useState<"selection" | "ai" | "manual">("selection");
  const [step, setStep] = useState(1);
  const [countdown, setCountdown] = useState({ days: 0, hours: 2, mins: 45, secs: 0 });

  // Countdown Logic (Mock)
  useEffect(() => {
    if (step === 5) {
      const timer = setInterval(() => {
        setCountdown((prev) => ({ ...prev, secs: prev.secs === 0 ? 59 : prev.secs - 1 }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  // Stepper Component
  const Stepper = () => {
    const steps = ["Hospital", "Doctor", "Date", "Slot", "Confirm"];
    return (
      <div className="flex justify-between items-center w-full max-w-3xl mx-auto mb-10 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10"></div>
        {steps.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;
          
          return (
            <div key={idx} className="flex flex-col items-center bg-slate-50 px-2">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold border-4 transition-all
                ${isCompleted ? "bg-patient border-patient text-white" : 
                  isActive ? "bg-white border-patient text-patient" : "bg-slate-100 border-slate-300 text-slate-400"}`}>
                {isCompleted ? <CheckCircle className="h-6 w-6" /> : stepNum}
              </div>
              <span className={`text-xs mt-2 font-medium ${isActive ? "text-patient" : "text-slate-500"}`}>{label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Screen 1: Selection Mode (AI vs Manual)
  if (mode === "selection") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">How would you like to book?</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            onClick={() => setMode("ai")}
            className="p-8 cursor-pointer hover:border-patient hover:shadow-xl transition-all group text-center space-y-4 border-2"
          >
            <div className="h-20 w-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-600 group-hover:scale-110 transition-transform">
              <Bot className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold">Chat with AI Agent</h3>
            <p className="text-slate-500 text-sm">Describe your pain, and our AI will find the best specialist and slot for you instantly.</p>
            <Button variant="outline" className="w-full">Start Chat</Button>
          </Card>

          <Card 
            onClick={() => setMode("manual")}
            className="p-8 cursor-pointer hover:border-patient hover:shadow-xl transition-all group text-center space-y-4 border-2"
          >
            <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 group-hover:scale-110 transition-transform">
              <User className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold">Manual Booking</h3>
            <p className="text-slate-500 text-sm">Browse hospitals, doctors, and calendar slots yourself to choose your preferred time.</p>
            <Button variant="outline" className="w-full">Book Manually</Button>
          </Card>
        </div>
      </div>
    );
  }

  // Screen 2: AI Chat Interface (Placeholder)
  if (mode === "ai") {
    return (
      <div className="p-6 max-w-2xl mx-auto h-[80vh] flex flex-col">
        <div className="flex-1 bg-white border rounded-xl p-4 shadow-sm mb-4">
          <div className="flex gap-3 mb-4">
             <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center text-white"><Bot size={16}/></div>
             <div className="bg-purple-50 p-3 rounded-lg text-sm max-w-[80%]">Hello! I am Dr. AI. Tell me, do you have pain or is this a routine checkup?</div>
          </div>
          <div className="flex gap-3 flex-row-reverse mb-4">
             <div className="bg-slate-100 p-3 rounded-lg text-sm max-w-[80%]">I have severe toothache in my lower jaw.</div>
          </div>
        </div>
        <div className="flex gap-2">
          <input className="flex-1 border rounded-lg px-4" placeholder="Type your symptoms..." />
          <Button variant="doctor">Send</Button>
        </div>
        <Button variant="ghost" onClick={() => setMode("selection")} className="mt-4">Back to Selection</Button>
      </div>
    );
  }

  // Screen 3: Manual Booking Wizard
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => step > 1 ? setStep(step-1) : setMode("selection")}>Back</Button>
        <h1 className="text-xl font-bold">New Appointment</h1>
      </div>

      <Stepper />

      <div className="max-w-3xl mx-auto">
        {/* Step 1: Select Hospital */}
        {step === 1 && (
          <div className="grid gap-4 animate-in slide-in-from-right">
             <h2 className="text-lg font-bold">Select Hospital</h2>
             {["City Dental Care", "Al-Shifa Main Branch", "Gulberg Dental Clinic"].map((h) => (
               <Card key={h} onClick={() => setStep(2)} className="p-4 flex items-center gap-4 cursor-pointer hover:border-patient">
                 <div className="h-12 w-12 bg-slate-100 rounded flex items-center justify-center"><Building2 className="text-slate-500"/></div>
                 <div className="font-bold">{h}</div>
                 <ChevronRight className="ml-auto text-slate-400"/>
               </Card>
             ))}
          </div>
        )}

        {/* Step 2: Select Doctor */}
        {step === 2 && (
          <div className="grid gap-4 animate-in slide-in-from-right">
             <h2 className="text-lg font-bold">Select Specialist</h2>
             {["Dr. Sarah Ahmed (Orthodontist)", "Dr. Bilal Karim (Surgeon)"].map((d) => (
               <Card key={d} onClick={() => setStep(3)} className="p-4 flex items-center gap-4 cursor-pointer hover:border-patient">
                 <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center"><User className="text-blue-600"/></div>
                 <div className="font-bold">{d}</div>
               </Card>
             ))}
          </div>
        )}

        {/* Step 3 & 4: Date & Slot (Simplified for brevity) */}
        {(step === 3 || step === 4) && (
          <div className="space-y-6 animate-in slide-in-from-right">
             <h2 className="text-lg font-bold">{step === 3 ? "Select Date" : "Select Time Slot"}</h2>
             <input type="date" className="w-full p-3 border rounded-lg" />
             {step === 4 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {["10:00 AM", "11:30 AM", "02:00 PM"].map(t => (
                    <Button key={t} variant="outline" onClick={() => setStep(5)}>{t}</Button>
                  ))}
                </div>
             )}
             {step === 3 && <Button className="w-full mt-4" onClick={() => setStep(4)}>Next</Button>}
          </div>
        )}

        {/* Step 5: Success & Countdown */}
        {step === 5 && (
          <div className="text-center animate-in zoom-in space-y-6">
            <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
               <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Booking Confirmed!</h2>
            
            {/* Countdown Timer */}
            <Card className="bg-slate-900 text-white p-6 max-w-sm mx-auto">
               <p className="text-sm text-slate-400 mb-2">Time until appointment</p>
               <div className="flex justify-center gap-4 text-center">
                 <div><div className="text-3xl font-mono font-bold">{countdown.days}</div><div className="text-xs">Days</div></div>
                 <div className="text-2xl font-bold">:</div>
                 <div><div className="text-3xl font-mono font-bold">{countdown.hours}</div><div className="text-xs">Hrs</div></div>
                 <div className="text-2xl font-bold">:</div>
                 <div><div className="text-3xl font-mono font-bold">{countdown.mins}</div><div className="text-xs">Mins</div></div>
                 <div className="text-2xl font-bold">:</div>
                 <div><div className="text-3xl font-mono font-bold text-patient">{countdown.secs}</div><div className="text-xs">Secs</div></div>
               </div>
            </Card>

            <Link href="/patient/dashboard">
              <Button variant="patient" className="mt-4">Go to Dashboard</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}