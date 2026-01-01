"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, User, ChevronRight, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function PatientList() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/auth/doctor/login");

      try {
        const response = await api.get("/doctor/patients", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPatients(response.data);
      } catch (error) {
        console.error("Error fetching patients", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [router]);

  // Search Logic
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">My Patients</h1>
        <Button variant="doctor">
          <Plus className="mr-2 h-4 w-4" /> Add New Record
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by name..." 
            className="pl-10" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline">Filter</Button>
      </div>

      {/* Patients Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-doctor" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No patients found. Appointments will appear here.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-medium text-slate-600">Name</th>
                  <th className="p-4 font-medium text-slate-600">Age / Gender</th>
                  <th className="p-4 font-medium text-slate-600">Last Visit</th>
                  <th className="p-4 font-medium text-slate-600">Condition</th>
                  <th className="p-4 font-medium text-slate-600">Status</th>
                  <th className="p-4 font-medium text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                          {p.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500">{p.age} Yrs • {p.gender}</td>
                    <td className="p-4 text-slate-500">{p.last_visit}</td>
                    <td className="p-4 text-slate-500">{p.condition}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link href={`/doctor/patients/${p.id}`}>
                        <Button variant="ghost" size="sm" className="text-doctor">
                          View <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
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