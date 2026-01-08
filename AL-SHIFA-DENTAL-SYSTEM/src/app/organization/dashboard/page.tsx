"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Activity, RefreshCcw, Loader2 } from "lucide-react";
import { OrganizationAPI } from "@/lib/api";

export default function OrgDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await OrganizationAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline"/> Loading...</div>;
  if (!stats) return <div className="p-10 text-center">Failed to load data</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of your clinic's performance</p>
        </div>
        <Button variant="outline" onClick={fetchStats}><RefreshCcw className="mr-2 h-4 w-4"/> Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Total Doctors</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-700">{stats.total_doctors}</div></CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-700">{stats.total_patients}</div></CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-700">Rs. {stats.total_revenue?.toLocaleString() || 0}</div></CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Utilization</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-700">{stats.utilization_rate}%</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {/* SAFE CHECK: Ensure recent_activity exists and has length */}
            {(!stats.recent_activity || stats.recent_activity.length === 0) ? (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity found.</p>
            ) : (
              <div className="space-y-4">
                {stats.recent_activity.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm text-slate-900">{item.description}</p>
                      <p className="text-xs text-slate-500">{item.date}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}