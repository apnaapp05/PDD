"use client";
import Link from "next/link";
import { User, Stethoscope, ArrowRight } from "lucide-react";

export default function RoleSelection() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-4xl">
        
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Welcome to Al-Shifa</h2>
          <p className="mt-2 text-slate-500">Please select your portal to continue</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Doctor Card */}
          <Link 
            href="/auth/doctor/login"
            className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl border-2 border-transparent hover:border-doctor/20"
          >
            <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-doctor/5 transition-transform group-hover:scale-150"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-doctor/10 text-doctor group-hover:bg-doctor group-hover:text-white transition-colors">
                <Stethoscope className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Doctor Portal</h3>
              <p className="mt-2 text-sm text-slate-500">
                Manage appointments, patients, and clinical inventory.
              </p>
              <span className="mt-6 flex items-center text-sm font-semibold text-doctor group-hover:underline">
                Access Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Patient Card */}
          <Link 
            href="/auth/patient/login"
            className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl border-2 border-transparent hover:border-patient/20"
          >
            <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-patient/5 transition-transform group-hover:scale-150"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-patient/10 text-patient group-hover:bg-patient group-hover:text-white transition-colors">
                <User className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Patient Portal</h3>
              <p className="mt-2 text-sm text-slate-500">
                Book appointments, view history, and contact doctors.
              </p>
              <span className="mt-6 flex items-center text-sm font-semibold text-patient group-hover:underline">
                Enter Portal <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center text-xs text-slate-400">
          SECURED BY AGENTIC AI &bull; HIPAA COMPLIANT STANDARDS
        </div>
      </div>
    </div>
  );
}
