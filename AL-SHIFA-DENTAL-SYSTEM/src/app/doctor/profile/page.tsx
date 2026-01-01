"use client";

import React, { useState } from "react";
import { DoctorAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Clock, Coffee, Save, CheckCircle } from "lucide-react";

export default function DoctorProfilePage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // State for the "15+5" Logic
  const [mode, setMode] = useState<"continuous" | "interleaved">("continuous");
  const [workDuration, setWorkDuration] = useState(20);
  const [breakDuration, setBreakDuration] = useState(0);

  const handleSave = async () => {
    setLoading(true);
    try {
      await DoctorAPI.updateConfig({
        slot_duration: workDuration,
        break_duration: mode === "interleaved" ? breakDuration : 0,
        work_start: "09:00", // Default for now
        work_end: "17:00"
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Clinical Configuration</h1>
        <p className="text-slate-500">Teach the AI how you like to work.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* CARD 1: SCHEDULING MODE */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 flex items-center mb-4">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Scheduling Strategy
          </h3>
          
          <div className="space-y-4">
            <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${mode === "continuous" ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
              <input type="radio" name="mode" className="mt-1" checked={mode === "continuous"} onChange={() => { setMode("continuous"); setBreakDuration(0); }} />
              <div className="ml-3">
                <span className="block text-sm font-bold text-slate-900">Continuous Flow</span>
                <span className="block text-xs text-slate-500 mt-1">
                  Back-to-back patients. No programmed breaks.
                  <br />(e.g., 20min, 20min, 20min...)
                </span>
              </div>
            </label>

            <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${mode === "interleaved" ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
              <input type="radio" name="mode" className="mt-1" checked={mode === "interleaved"} onChange={() => setMode("interleaved")} />
              <div className="ml-3">
                <span className="block text-sm font-bold text-slate-900">Interleaved (Smart Breaks)</span>
                <span className="block text-xs text-slate-500 mt-1">
                  Work block + small recovery break.
                  <br />(e.g., 15min Work + 5min Coffee)
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* CARD 2: TIME CONFIG */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 flex items-center mb-4">
            <Coffee className="h-5 w-5 mr-2 text-purple-600" />
            Time Allocation
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Consultation Duration (mins)
              </label>
              <input 
                type="number" 
                value={workDuration}
                onChange={(e) => setWorkDuration(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>

            {mode === "interleaved" && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Break / Buffer Time (mins)
                </label>
                <input 
                  type="number" 
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(Number(e.target.value))}
                  className="w-full p-2 border rounded-md border-purple-200 bg-purple-50"
                />
              </div>
            )}

            <div className="pt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
              <span className="font-bold">Result:</span> Your AI will generate slots every 
              <span className="font-bold text-blue-600"> {workDuration + breakDuration} minutes</span>.
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} className="w-40">
          {loading ? "Saving..." : success ? <><CheckCircle className="mr-2 h-4 w-4"/> Saved</> : <><Save className="mr-2 h-4 w-4"/> Save Config</>}
        </Button>
      </div>
    </div>
  );
}