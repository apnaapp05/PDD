"use client";
import { useState } from "react";
import KycTable from "@/components/kyc/KycTable";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Mock Data (Replace with API call)
const MOCK_DOCTORS = [
  { id: "DOC_101", name: "Dr. John Doe", license: "PMC-12345", hospital: "Al-Shifa Dental", status: "pending" },
  { id: "DOC_102", name: "Dr. Sarah Smith", license: "DCI-88990", hospital: "City Care", status: "approved" },
  { id: "DOC_103", name: "Dr. Ali Khan", license: "PMC-55667", hospital: "Apex Clinic", status: "rejected" },
];

export default function DoctorKycPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleApprove = (id: string) => console.log("Approve", id);
  const handleReject = (id: string) => console.log("Reject", id);
  const handleView = (id: string) => console.log("View", id);

  const filteredData = MOCK_DOCTORS.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.license.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Verification</h1>
          <p className="text-sm text-slate-500">Review and verify medical licenses.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search doctor or license..." 
            className="pl-9 bg-white" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <KycTable 
        data={filteredData}
        columns={[
          { header: "Doctor Name", key: "name" },
          { header: "Hospital", key: "hospital" },
          { header: "License No.", key: "license" },
        ]}
        onApprove={handleApprove}
        onReject={handleReject}
        onView={handleView}
      />
    </div>
  );
}