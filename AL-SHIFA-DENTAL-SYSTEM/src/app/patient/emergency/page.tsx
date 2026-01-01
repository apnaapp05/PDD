"use client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, MapPin, Ambulance } from "lucide-react";
import Link from "next/link";

export default function Emergency() {
  return (
    <div className="min-h-screen bg-red-50 p-6 flex flex-col">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/patient/dashboard"><Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm text-red-600 hover:bg-red-100 hover:text-red-700"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-xl font-bold text-red-900">Emergency Help</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div className="text-center space-y-2 mb-8">
           <div className="h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
             <Ambulance className="h-12 w-12 text-red-600" />
           </div>
           <h2 className="text-2xl font-bold text-red-900">Do you need urgent help?</h2>
           <p className="text-red-700/80 text-sm">Our emergency dental unit is on standby.</p>
        </div>

        <Button className="h-16 text-xl bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-xl shadow-red-600/30 animate-bounce">
          <Phone className="mr-3 h-6 w-6" /> Call Ambulance
        </Button>

        <Button className="h-16 text-xl bg-white text-red-700 border-2 border-red-200 hover:bg-red-50 rounded-2xl">
          <MapPin className="mr-3 h-6 w-6" /> Share My Location
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-red-100 text-center text-xs text-slate-500 mt-auto">
        If you are experiencing life-threatening symptoms, please call 1122 immediately.
      </div>
    </div>
  );
}