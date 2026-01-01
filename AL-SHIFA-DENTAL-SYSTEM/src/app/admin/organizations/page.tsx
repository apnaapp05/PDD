"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle, MapPin, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/organizations");
      setOrgs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleVerify = async (id: number) => {
    try {
      await api.post(`/admin/approve-account/${id}?type=organization`);
      fetchOrgs(); // Refresh list
    } catch (e) {
      alert("Failed to verify");
    }
  };

  const filteredOrgs = orgs.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    o.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registered Clinics</h1>
          <p className="text-sm text-slate-500">Manage all organization accounts</p>
        </div>
        <div className="relative w-64">
           <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
           <Input 
             placeholder="Search clinics..." 
             className="pl-9"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400"/></div>
        ) : filteredOrgs.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No organizations found.</p>
        ) : (
          filteredOrgs.map((org) => (
            <Card key={org.id} className="flex flex-row items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {org.name}
                    {org.is_verified && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {org.address || "No address provided"}
                  </p>
                </div>
              </div>
              
              <div>
                {!org.is_verified ? (
                  <Button size="sm" onClick={() => handleVerify(org.id)} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                    Verify Now
                  </Button>
                ) : (
                  <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                    VERIFIED
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}