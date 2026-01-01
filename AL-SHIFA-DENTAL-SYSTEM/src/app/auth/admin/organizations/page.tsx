"use client";
import { useState } from "react";
import KycTable from "@/components/kyc/KycTable";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Mock Data
const MOCK_ORGS = [
  { id: "ORG_01", name: "Al-Shifa Dental Center", location: "Hyderabad, IND", reg_no: "REG-9900", status: "pending" },
  { id: "ORG_02", name: "Sunshine General Hospital", location: "Mumbai, IND", reg_no: "REG-1122", status: "pending" },
];

export default function OrgKycPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleApprove = (id: string) => console.log("Approve Org", id);
  const handleReject = (id: string) => console.log("Reject Org", id);
  const handleView = (id: string) => console.log("View Org", id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Verification</h1>
          <p className="text-sm text-slate-500">Validate facility registrations.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search hospital name..." 
            className="pl-9 bg-white" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <KycTable 
        data={MOCK_ORGS}
        columns={[
          { header: "Hospital Name", key: "name" },
          { header: "Location", key: "location" },
          { header: "Registration No.", key: "reg_no" },
        ]}
        onApprove={handleApprove}
        onReject={handleReject}
        onView={handleView}
      />
    </div>
  );
}