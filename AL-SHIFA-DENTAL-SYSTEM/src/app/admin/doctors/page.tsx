"use client";
import { useEffect, useState } from "react";
import { AdminAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, CheckCircle, FileBadge, Search, Loader2, Trash2, Building } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await AdminAPI.getDoctors();
      setDoctors(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleVerify = async (id: number) => {
    try {
      await AdminAPI.approveAccount(id, "doctor");
      fetchDocs();
    } catch (e) {
      alert("Failed to verify");
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Are you sure? This will delete the doctor's account permanently.")) return;
    try {
      await AdminAPI.deleteEntity(id, "doctor");
      fetchDocs();
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const filteredDocs = doctors.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.license?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medical Staff</h1>
          <p className="text-sm text-slate-500">Verification & management of doctors</p>
        </div>
        <div className="relative w-72">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
           <Input 
             placeholder="Search doctor or license..." 
             className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-slate-400 h-8 w-8"/></div>
        ) : filteredDocs.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
             <Stethoscope className="h-12 w-12 text-slate-300 mx-auto mb-3" />
             <p className="text-slate-500">No doctors found.</p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <Card key={doc.id} className="p-6 hover:shadow-lg transition-all border-slate-200 group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
               </div>

              <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm">
                  <Stethoscope className="h-6 w-6 text-indigo-600" />
                </div>
                {doc.is_verified ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200">
                     VERIFIED <CheckCircle className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full border border-yellow-200 animate-pulse">
                     PENDING
                  </span>
                )}
              </div>
              
              <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{doc.name}</h3>
              <p className="text-sm text-indigo-600 font-medium mb-4">{doc.specialization}</p>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileBadge className="h-3.5 w-3.5 text-slate-400" /> 
                    License: <span className="font-mono text-slate-700 bg-slate-100 px-1 rounded">{doc.license}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Building className="h-3.5 w-3.5 text-slate-400" /> 
                    <span className="line-clamp-1">{doc.hospital_name}</span>
                </div>
              </div>

              {!doc.is_verified ? (
                <Button size="sm" onClick={() => handleVerify(doc.id)} className="w-full bg-slate-900 text-white hover:bg-slate-800 shadow-md">
                  Approve Application
                </Button>
              ) : (
                 <div className="h-9 w-full"></div> /* Spacer */
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}