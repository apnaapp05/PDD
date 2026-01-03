"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, Trash2, AlertCircle, RefreshCcw } from "lucide-react";
import { OrganizationAPI } from "@/lib/api";

export default function OrgDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await OrganizationAPI.getDoctors();
      setDoctors(response.data);
    } catch (error) {
      console.error("Failed to fetch doctors", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleVerify = async (id: number) => {
    if(!confirm("Are you sure you want to approve this doctor?")) return;
    try {
      await OrganizationAPI.verifyDoctor(id);
      fetchDoctors(); // Refresh list
    } catch (error) {
      alert("Failed to verify doctor");
    }
  };

  const handleRemove = async (id: number) => {
    if(!confirm("Warning: This will delete the doctor account permanently. Continue?")) return;
    try {
      await OrganizationAPI.removeDoctor(id);
      fetchDoctors(); // Refresh list
    } catch (error) {
      alert("Failed to remove doctor");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medical Staff</h1>
          <p className="text-sm text-slate-500">Manage doctors and permissions</p>
        </div>
        <Button variant="outline" onClick={fetchDoctors} className="flex gap-2">
           <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {doctors.length === 0 && !loading ? (
           <Card>
             <CardContent className="p-8 text-center text-slate-500">
               No doctors found. Doctors must sign up and select your hospital to appear here.
             </CardContent>
           </Card>
        ) : (
          doctors.map((doc) => (
            <Card key={doc.id} className="flex flex-row items-center justify-between p-4 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg 
                  ${doc.status === 'Verified' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  {doc.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{doc.full_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>{doc.specialization}</span>
                    <span>•</span>
                    <span className="font-mono text-xs">{doc.license}</span>
                  </div>
                  <div className="mt-1">
                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        doc.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                     }`}>
                        {doc.status}
                     </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {doc.status !== 'Verified' && (
                  <Button onClick={() => handleVerify(doc.id)} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                    <UserCheck className="h-4 w-4 mr-2" /> Approve
                  </Button>
                )}
                <Button onClick={() => handleRemove(doc.id)} size="sm" variant="destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}