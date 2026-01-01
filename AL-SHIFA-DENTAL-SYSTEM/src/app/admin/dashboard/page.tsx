"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Building2, RefreshCcw, MapPin, ShieldAlert, XCircle } from "lucide-react";
import { api } from "@/lib/api"; 
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/pending-verifications");
      setPending(res.data.pending);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id: number, type: string) => {
    try {
      await api.post(`/admin/approve-account/${id}?type=${type}`);
      setPending(prev => prev.filter(item => item.id !== id));
      alert("Approved Successfully");
    } catch (err) { alert("Approval Failed"); }
  };

  const handleReject = async (id: number, type: string) => {
    if (!confirm("Are you sure you want to reject this request? This will DELETE the user from the database.")) return;
    try {
      await api.post(`/admin/reject-account/${id}?type=${type}`);
      setPending(prev => prev.filter(item => item.id !== id));
      alert("Rejected and Account Deleted");
    } catch (err) { alert("Rejection Failed"); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
        <Button variant="outline" onClick={fetchPending} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="border-t-4 border-blue-600 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
             <ShieldAlert className="text-blue-600 h-5 w-5" /> 
             Pending Approvals ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No pending requests found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{item.name}</h4>
                      <p className="text-sm text-slate-500 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> {item.detail}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex gap-2">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleApprove(item.id, item.type)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => handleReject(item.id, item.type)}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}