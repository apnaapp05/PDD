"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Building2, Stethoscope, User, Shield, ArrowRight } from "lucide-react";

export default function RoleSwitcher({ onItemClick }) {
  const router = useRouter();

  const handleNavigation = (path) => {
    router.push(path);
    if (onItemClick) onItemClick(); // CLOSE SIDEBAR
  };

  const portals = [
    { 
      label: "Patient Portal", 
      path: "/auth/patient/login", 
      icon: User, 
      color: "text-green-600", 
      bg: "bg-green-50" 
    },
    { 
      label: "Doctor Portal", 
      path: "/auth/doctor/login", 
      icon: Stethoscope, 
      color: "text-blue-600", 
      bg: "bg-blue-50" 
    },
    { 
      label: "Organization Portal", 
      path: "/auth/organization/login", 
      icon: Building2, 
      color: "text-purple-600", 
      bg: "bg-purple-50" 
    },
    { 
      label: "Admin Access", 
      path: "/auth/admin/login", // FIX: Changed from dashboard to login
      icon: Shield, 
      color: "text-slate-600", 
      bg: "bg-slate-100" 
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Portal</h3>
      </div>
      <div className="divide-y divide-slate-50">
        {portals.map((portal) => (
          <button
            key={portal.label}
            onClick={() => handleNavigation(portal.path)}
            className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${portal.bg} ${portal.color}`}>
                <portal.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{portal.label}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}