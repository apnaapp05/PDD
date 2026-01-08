"use client";
import { useEffect, useState } from "react";
import { AdminAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle, MapPin, Search, Loader2, Trash2, Mail, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await AdminAPI.getOrganizations();
      setOrgs(res.data);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const handleVerify = async (id: number) => {
    if(!confirm("Approve this organization and its location?")) return;
    try {
      await AdminAPI.approveAccount(id, "organization");
      fetchOrgs();
    } catch (e) { alert("Failed to verify"); }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Are you sure? This will delete the organization permanently.")) return;
    try {
      await AdminAPI.deleteEntity(id, "organization");
      fetchOrgs();
    } catch (e) { alert("Failed to delete"); }
  };

  const openMap = (lat: number, lng: number) => {
    if(lat && lng) window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
  };

  const filteredOrgs = orgs.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    o.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
          <p className="text-sm text-slate-500">Manage clinics and location approvals</p>
        </div>
        <div className="relative w-72">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
           <Input 
             placeholder="Search..." 
             className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400 h-8 w-8"/></div>
        ) : filteredOrgs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
             <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
             <p className="text-slate-500">No organizations found.</p>
          </div>
        ) : (
          filteredOrgs.map((org) => (
            <Card key={org.id} className="flex flex-col md:flex-row items-center justify-between p-6 hover:shadow-md transition-all border-slate-200">
              <div className="flex items-center gap-5 w-full md:w-auto mb-4 md:mb-0">
                <div className="h-14 w-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm">
                  <Building2 className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                    {org.name}
                    {org.is_verified && <CheckCircle className="h-5 w-5 text-green-500" />}
                  </h3>
                  <div className="space-y-1 mt-1">
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" /> {org.address || "No address"}
                    </p>
                    {org.pending_address && (
                        <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-center gap-1 w-fit">
                            <MapPin className="h-3 w-3" /> New Location Requested: {org.pending_address}
                            <button onClick={() => openMap(org.pending_lat, org.pending_lng)} className="ml-2 hover:underline flex items-center">
                                View <ExternalLink className="h-3 w-3 ml-1"/>
                            </button>
                        </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto pl-19 md:pl-0">
                {(!org.is_verified || org.pending_address) && (
                  <Button size="sm" onClick={() => handleVerify(org.id)} className="bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200 shadow-lg">
                    {org.pending_address ? "Approve Location" : "Verify Account"}
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => handleDelete(org.id)} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200">
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