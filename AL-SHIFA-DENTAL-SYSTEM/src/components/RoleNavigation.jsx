"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";

export default function RoleNavigation({ onItemClick }) {
  const pathname = usePathname();
  const router = useRouter();

  // Guard: if pathname is null, default to empty string
  const currentPath = pathname || "";
  
  // LOGIC FIX: If we are in the /auth/ section (Role Selection, Login, etc.), 
  // do NOT show any role-specific menu items.
  if (currentPath.includes("/auth/role-selection") || currentPath === "/auth") {
    return null;
  }

  // Extract role from URL (e.g., /doctor/dashboard -> doctor)
  // Adjust index based on your specific URL structure. 
  // For /auth/admin/..., role might be at index 2 or 3 depending on split.
  // We prioritize checking the segment logic.
  let role = "patient"; // Default fallback
  
  if (currentPath.includes("/admin")) role = "admin";
  else if (currentPath.includes("/organization")) role = "organization";
  else if (currentPath.includes("/doctor")) role = "doctor";
  else if (currentPath.includes("/patient")) role = "patient";

  const navMap = {
    admin: [
      { label: "Dashboard", path: "/auth/admin/dashboard" },
      { label: "Hospitals (KYC)", path: "/auth/admin/organizations" },
      { label: "Doctors (KYC)", path: "/auth/admin/doctors" }
    ],
    organization: [
      { label: "Dashboard", path: "/organization/dashboard" },
      { label: "Doctors", path: "/organization/doctors" },
      { label: "Profile", path: "/organization/profile" }
    ],
    doctor: [
      { label: "Dashboard", path: "/doctor/dashboard" },
      { label: "Schedule", path: "/doctor/schedule" },
      { label: "Inventory", path: "/doctor/inventory" },
      { label: "Finance", path: "/doctor/finance" },
      { label: "Patients", path: "/doctor/patients" }
    ],
    patient: [
      { label: "Dashboard", path: "/patient/dashboard" },
      { label: "Appointments", path: "/patient/appointments" },
      { label: "Book New", path: "/patient/appointments/new" },
      { label: "Records", path: "/patient/records" }
    ]
  };

  const items = navMap[role] || [];

  const handleNavigation = (path) => {
    router.push(path);
    if (onItemClick) onItemClick(); // Close sidebar on mobile/action
  };

  return (
    <nav className="mt-4 space-y-1">
      {items.map((item) => (
        <button
          key={item.path}
          onClick={() => handleNavigation(item.path)}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium flex items-center relative overflow-hidden group ${
            currentPath === item.path 
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30" 
              : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
          }`}
        >
          {/* Hover Effect Background */}
          <div className={`absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${currentPath === item.path ? 'hidden' : ''}`} />
          
          <span className="relative z-10">{item.label}</span>
          
          {/* Active Indicator Dot */}
          {currentPath === item.path && (
            <div className="absolute right-3 h-2 w-2 bg-white rounded-full animate-pulse" />
          )}
        </button>
      ))}
    </nav>
  );
}