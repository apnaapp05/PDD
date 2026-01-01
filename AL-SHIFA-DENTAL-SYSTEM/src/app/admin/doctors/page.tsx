"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, CheckCircle, FileBadge, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/doctors");
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
      await api.post(`/admin/approve-account/${id}?type=doctor`);
      fetchDocs();
    } catch (e) {
      alert("Failed to verify");
    }
  };

  const filteredDocs = doctors.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.license?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medical Staff Registry</h1>
          <p className="text-sm text-slate-500">Verification status of all doctors</p>
        </div>
        <div className="relative w-64">
           <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
           <Input 
             placeholder="Search doctors..." 
             className="pl-9"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-slate-400"/></div>
        ) : filteredDocs.length === 0 ? (
          <p className="col-span-full text-center text-slate-500 py-8">No doctors found.</p>
        ) : (
          filteredDocs.map((doc) => (
            <Card key={doc.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-indigo-600" />
                </div>
                {doc.is_verified ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <div className="h-3 w-3 bg-yellow-500 rounded-full animate-pulse" title="Pending Verification" />
                )}
              </div>
              
              <h3 className="font-bold text-lg text-slate-900">{doc.name}</h3>
              <p className="text-sm text-indigo-600 font-medium mb-2">{doc.specialization}</p>
              
              <div className="bg-slate-50 p-2 rounded text-xs text-slate-500 mb-4 flex items-center gap-2">
                <FileBadge className="h-3 w-3" /> License: <span className="font-mono text-slate-700">{doc.license}</span>
              </div>

              {!doc.is_verified ? (
                <Button size="sm" onClick={() => handleVerify(doc.id)} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                  Approve License
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="w-full text-slate-400 cursor-default hover:bg-transparent">
                  Verified
                </Button>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}