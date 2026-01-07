"use client";
import { useEffect, useState } from "react";
import { AdminAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserSquare2, Search, Loader2, Trash2, Calendar, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminPatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await AdminAPI.getPatients();
      setPatients(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleDelete = async (id: number) => {
    if(!confirm("DANGER: This will permanently delete the patient, their medical history, and appointments. Continue?")) return;
    try {
      await AdminAPI.deleteEntity(id, "patient");
      fetchPatients();
    } catch (e) {
      alert("Failed to delete patient");
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Database</h1>
          <p className="text-sm text-slate-500">Total registered patients: {patients.length}</p>
        </div>
        <div className="relative w-72">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
           <Input 
             placeholder="Search by name or email..." 
             className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                    <th className="px-6 py-4">Patient Name</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Demographics</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {loading ? (
                   <tr><td colSpan={5} className="text-center py-12"><Loader2 className="animate-spin h-6 w-6 text-slate-400 mx-auto"/></td></tr>
                ) : filteredPatients.length === 0 ? (
                   <tr><td colSpan={5} className="text-center py-12 text-slate-500">No patients found.</td></tr>
                ) : (
                    filteredPatients.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                                    {p.name.charAt(0)}
                                </div>
                                {p.name}
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3" /> {p.email}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                                {p.age} yrs / {p.gender}
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> {p.created_at}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0" onClick={() => handleDelete(p.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}