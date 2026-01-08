"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, DollarSign, Calendar, Sparkles, CheckCircle2, Clock, 
  RefreshCcw, PlayCircle, Loader2, AlertCircle 
} from "lucide-react";
import { DoctorAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DoctorDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/auth/doctor/login");

    try {
      setLoading(true);
      setError(false);
      const res = await DoctorAPI.getDashboardStats();
      // Check if data actually exists
      if (res && res.data) {
        setStats(res.data);
      } else {
        setError(true);
      }
    } catch (error) {
      console.error("Dashboard error", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const handleStart = async (id: number) => {
    try {
      await DoctorAPI.startAppointment(id);
      fetchDashboard();
    } catch (e) { alert("Failed to start appointment."); }
  };

  const handleComplete = async (id: number) => {
    if(!confirm("Mark as Complete? This will finalize the invoice and deduct inventory.")) return;
    try {
        await DoctorAPI.completeAppointment(id);
        alert("Completed!");
        fetchDashboard();
    } catch(e) { alert("Error completing appointment"); }
  };

  // --- 1. LOADING STATE ---
  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-2"/>
      <span className="text-slate-500 font-medium">Loading Dashboard...</span>
    </div>
  );

  // --- 2. ERROR STATE (Prevents the Crash) ---
  if (error || !stats) return (
    <div className="flex flex-col h-screen items-center justify-center gap-4">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h2 className="text-xl font-bold text-slate-900">Failed to load dashboard data</h2>
      <p className="text-slate-500 text-sm">This usually happens if the database needs a reset.</p>
      <Button onClick={fetchDashboard} variant="outline">
        <RefreshCcw className="h-4 w-4 mr-2"/> Retry
      </Button>
    </div>
  );

  // --- 3. NO PROFILE STATE ---
  if (stats.account_status === "no_profile") return (
    <div className="p-10 text-center">
      <h2 className="text-xl font-bold mb-2">Profile Incomplete</h2>
      <p className="text-slate-500 mb-4">Please complete your doctor profile to access the dashboard.</p>
      <Button onClick={() => router.push("/doctor/profile")}>Go to Profile</Button>
    </div>
  );

  // --- 4. MAIN DASHBOARD ---
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Medical Dashboard</h1>
          {/* Use optional chaining (?.) just in case */}
          <p className="text-slate-500">Welcome back, Dr. {stats?.doctor_name}</p>
        </div>
        <Button variant="outline" onClick={fetchDashboard}><RefreshCcw className="h-4 w-4 mr-2"/> Refresh</Button>
      </div>
      
      {/* INSIGHTS */}
      <Card className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white border-none shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-100">
            <Sparkles className="h-5 w-5 text-yellow-400" /> Smart Practice Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase text-indigo-300 mb-1">Queue Analysis</p>
            <p className="text-sm leading-relaxed">{stats.analysis?.queue || "No data"}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase text-purple-300 mb-1">Inventory Health</p>
            <p className="text-sm leading-relaxed">{stats.analysis?.inventory || "No data"}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase text-green-300 mb-1">Financial Projection</p>
            <p className="text-sm leading-relaxed">{stats.analysis?.revenue || "No data"}</p>
          </div>
        </CardContent>
      </Card>

      {/* STATS CARDS */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-600 bg-white hover:shadow-lg transition-all cursor-pointer" onClick={() => router.push("/doctor/schedule")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Appointments Today</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-slate-900">{stats.today_count || 0}</div></CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-white hover:shadow-lg transition-all cursor-pointer" onClick={() => router.push("/doctor/finance")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Realized Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-slate-900">Rs. {stats.revenue || 0}</div></CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 bg-white hover:shadow-lg transition-all cursor-pointer" onClick={() => router.push("/doctor/patients")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-slate-900">{stats.total_patients || 0}</div></CardContent>
        </Card>
      </div>

      {/* TODAY'S SCHEDULE */}
      <Card className="bg-white border border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="flex items-center gap-2 text-slate-800"><Clock className="h-5 w-5 text-blue-600" /> Workflow Management</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {(!stats.appointments || stats.appointments.length === 0) ? (
              <div className="p-10 text-center text-slate-500">No appointments today.</div>
            ) : (
              stats.appointments.map((appt: any) => (
                <div key={appt.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${appt.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {appt.patient_name ? appt.patient_name[0] : "U"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{appt.patient_name || "Unknown"}</p>
                      <p className="text-xs text-slate-500">{appt.treatment} • {appt.time}</p>
                    </div>
                  </div>
                  
                  {/* ACTIONS */}
                  <div>
                    {appt.status === 'confirmed' && (
                      <Button size="sm" onClick={() => handleStart(appt.id)} className="bg-blue-600 hover:bg-blue-700">
                        <PlayCircle className="h-4 w-4 mr-1"/> Start
                      </Button>
                    )}
                    {appt.status === 'in_progress' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded border border-orange-100">In Progress</span>
                        <Button size="sm" onClick={() => handleComplete(appt.id)} className="bg-green-600 hover:bg-green-700 shadow-sm">
                          <CheckCircle2 className="h-4 w-4 mr-1"/> Complete
                        </Button>
                      </div>
                    )}
                    {appt.status === 'completed' && (
                      <span className="text-green-600 text-xs font-bold flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1"/> Completed
                      </span>
                    )}
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