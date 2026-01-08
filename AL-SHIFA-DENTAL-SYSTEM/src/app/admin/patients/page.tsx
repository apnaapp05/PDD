"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Trash2, RefreshCcw, Loader2 } from "lucide-react";
import { AdminAPI } from "@/lib/api";

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await AdminAPI.getPatients();
      setPatients(response.data);
    } catch (error) {
      console.error("Failed to fetch patients", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients Registry</h1>
          <p className="text-sm text-slate-500">View registered patients</p>
        </div>
        <Button variant="outline" onClick={fetchPatients} className="flex gap-2">
           <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {patients.length === 0 ? (
             <div className="p-8 text-center text-slate-500">No patients found.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-medium text-slate-500">Name</th>
                  <th className="p-4 font-medium text-slate-500">Email</th>
                  <th className="p-4 font-medium text-slate-500">Age / Gender</th>
                  <th className="p-4 font-medium text-slate-500">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900">{p.name}</span>
                    </td>
                    <td className="p-4 text-slate-600">{p.email}</td>
                    <td className="p-4 text-slate-600">{p.age || "N/A"} / {p.gender || "N/A"}</td>
                    <td className="p-4 text-slate-500">{p.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}