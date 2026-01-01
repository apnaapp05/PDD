"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, AlertTriangle, Clock, Calendar, RefreshCcw } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function DoctorDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>({
    today_count: 0,
    total_patients: 0,
    revenue: 0,
    appointments: []
  });
  const [loading, setLoading] = useState(true);

  // Function to Fetch Data
  const fetchDashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/doctor/login");
      return;
    }

    try {
      const response = await api.get("/doctor/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <button onClick={fetchDashboard} className="flex items-center gap-2 text-sm text-doctor hover:underline">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>
      
      {/* KPI Section - REAL DATA */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-doctor shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Appointments (Today)</CardTitle>
            <Users className="h-4 w-4 text-doctor" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today_count}</div>
            <p className="text-xs text-slate-500">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Patients</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_patients}</div>
            <p className="text-xs text-slate-500">Unique patients served</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Est. Revenue</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats.revenue}</div>
            <p className="text-xs text-slate-500">Based on today's visits</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Critical Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-slate-500">Items low (Mock)</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Left: Today's Appointments List */}
        <Card className="col-span-4 shadow-md bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-doctor" /> Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {stats.appointments.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No appointments scheduled for today.
                </div>
              ) : (
                stats.appointments.map((patient: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 border border-blue-100">
                        {patient.patient_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{patient.patient_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{patient.treatment}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">{patient.time}</p>
                      <span className={`text-[10px] uppercase font-bold mt-1 block ${
                        patient.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {patient.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: AI Insights Feed */}
        <Card className="col-span-3 bg-gradient-to-br from-slate-50 to-white border border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <p className="text-sm text-slate-900 font-bold mb-1">🤖 Schedule Optimization</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You have a 2-hour gap between 12:00 PM and 02:00 PM. Would you like me to open this slot for emergency walk-ins?
                </p>
                <div className="mt-2 flex gap-2">
                  <button className="text-xs bg-doctor text-white px-3 py-1 rounded-full">Yes, Open Slot</button>
                  <button className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">Ignore</button>
                </div>
              </div>
              
              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm opacity-75">
                <p className="text-sm text-slate-900 font-bold mb-1">⚠️ Inventory Alert</p>
                <p className="text-xs text-slate-500">
                  Lidocaine stock is projected to run out by Tuesday based on current appointment volume.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}