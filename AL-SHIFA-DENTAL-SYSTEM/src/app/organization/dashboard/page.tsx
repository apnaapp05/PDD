"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, Activity, RefreshCcw } from "lucide-react";
import { OrganizationAPI } from "@/lib/api";

export default function OrgDashboard() {
  const [stats, setStats] = useState<any>({
    total_doctors: 0,
    total_patients: 0,
    total_revenue: 0,
    utilization_rate: 0,
    recent_activity: []
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await OrganizationAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error("Failed to load org stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organization Overview</h1>
          <p className="text-sm text-slate-500">Al-Shifa Dental System - Master View</p>
        </div>
        <button onClick={fetchStats} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-blue-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Doctors</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_doctors}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Patients</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_patients}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats.total_revenue}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Clinic Utilization</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.utilization_rate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity List */}
      <Card className="shadow-md bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>System Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {stats.recent_activity.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No recent activity found.</div>
            ) : (
              stats.recent_activity.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">New Appointment Booked</p>
                      <p className="text-xs text-slate-500">Doctor ID: {item.doctor_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-400">{item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}