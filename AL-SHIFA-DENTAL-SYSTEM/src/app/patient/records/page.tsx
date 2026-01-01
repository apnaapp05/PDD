"use client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, Calendar } from "lucide-react";
import Link from "next/link";

export default function PatientRecords() {
  const records = [
    { id: 1, type: "Prescription", date: "12 Dec 2024", doctor: "Dr. Sarah Ahmed", desc: "Amoxicillin 500mg, Ibuprofen", file: "RX-2024-001.pdf" },
    { id: 2, type: "X-Ray Report", date: "01 Dec 2024", doctor: "Dr. Bilal Karim", desc: "Lower Molar Root Canal Analysis", file: "XRAY-89.jpg" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/patient/dashboard"><Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-xl font-bold text-slate-900">Medical Records</h1>
      </div>

      <div className="space-y-6">
        {records.map((rec) => (
          <div key={rec.id} className="relative pl-8 border-l-2 border-slate-200 last:border-0 pb-8">
            <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-patient border-2 border-white shadow-sm"></div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">{rec.type}</span>
                <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> {rec.date}</span>
              </div>
              <h3 className="font-bold text-slate-900">{rec.desc}</h3>
              <p className="text-xs text-slate-500 mt-1">Prescribed by {rec.doctor}</p>
              <Button variant="outline" size="sm" className="w-full mt-4 text-slate-600 border-slate-200 hover:bg-slate-50">
                <Download className="mr-2 h-4 w-4" /> Download {rec.file.split('.').pop()?.toUpperCase()}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}