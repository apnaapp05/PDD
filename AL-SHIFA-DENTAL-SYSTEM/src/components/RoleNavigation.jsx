"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";

export default function RoleNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  // Guard: if pathname is null (rare), default to empty string
  const currentPath = pathname || "";
  const role = currentPath.split("/")[2] || "patient"; // Adjust index based on URL structure: /auth/doctor/...

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

  // Fallback to patient menu if role not found
  const items = navMap[role] || navMap['patient'];

  return (
    <nav className="mt-4">
      {items.map((item) => (
        <button
          key={item.path}
          onClick={() => router.push(item.path)}
          className={`w-full text-left px-4 py-3 mb-1 rounded-lg transition-colors text-sm font-medium ${
            currentPath === item.path 
              ? "bg-blue-50 text-blue-700 border-r-4 border-blue-600" 
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}