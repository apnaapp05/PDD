"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  DollarSign, 
  Calendar, 
  Package, 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCcw, 
  Stethoscope, 
  ChevronRight 
} from "lucide-react";
import { DoctorAPI, AuthAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DoctorDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Join Organization State
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [joinForm, setJoinForm] = useState({
    hospital_id: "",
    specialization: "",
    license_number: ""
  });

  const fetchDashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/doctor/login");
      return;
    }

    try {
      setLoading(true);
      // Fetch Dashboard Stats AND Inventory Count in parallel
      const [dashboardRes, inventoryRes] = await Promise.all([
        DoctorAPI.getDashboardStats(),
        DoctorAPI.getInventory().catch(() => ({ data: [] })) // Fail safe if inventory API errors
      ]);

      setStats(dashboardRes.data);
      setInventoryCount(inventoryRes.data.length || 0);
      
      // If no profile, fetch hospitals for the join form
      if (dashboardRes.data.account_status === "no_profile") {
         const hospRes = await AuthAPI.getVerifiedHospitals();
         setHospitals(hospRes.data);
      }

    } catch (error) {
      console.error("Failed to fetch dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleJoin = async () => {
    if(!joinForm.hospital_id || !joinForm.specialization || !joinForm.license_number) {
      alert("Please fill all fields");
      return;
    }
    try {
      setLoading(true);
      await DoctorAPI.joinOrganization({
        hospital_id: parseInt(joinForm.hospital_id),
        specialization: joinForm.specialization,
        license_number: joinForm.license_number
      });
      alert("Request Sent! Please wait for the organization to approve you.");
      fetchDashboard();
    } catch (error) {
      alert("Failed to send request.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (apptId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if(!confirm("Mark appointment as complete? This will generate a bill and deduct inventory.")) return;
    try {
      const res = await DoctorAPI.completeAppointment(apptId);
      alert(res.data.details.join("\n")); 
      fetchDashboard(); 
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to complete");
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <RefreshCcw className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  // --- STATE: NO PROFILE (Show Join Form) ---
  if (stats?.account_status === "no_profile") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 mt-10 p-6">
        <Card className="border-l-4 border-l-yellow-500 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-6 w-6" /> Action Required: Join an Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">Please select a hospital to join to start practicing.</p>
            <div className="space-y-4 bg-slate-50 p-6 rounded-lg border border-slate-100">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Select Hospital</label>
                <select 
                  className="w-full h-10 rounded-md border border-slate-300 px-3 bg-white"
                  onChange={(e) => setJoinForm({...joinForm, hospital_id: e.target.value})}
                >
                  <option value="">-- Choose Hospital --</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.address})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Your Specialization</label>
                <div className="relative">
                   <Stethoscope className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                   <Input 
                      className="pl-10" 
                      placeholder="e.g. Orthodontist" 
                      value={joinForm.specialization}
                      onChange={(e) => setJoinForm({...joinForm, specialization: e.target.value})}
                   />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">License Number</label>
                <Input 
                    placeholder="e.g. PMDC-12345" 
                    value={joinForm.license_number}
                    onChange={(e) => setJoinForm({...joinForm, license_number: e.target.value})}
                 />
              </div>
              <Button onClick={handleJoin} className="w-full bg-blue-600 hover:bg-blue-700 mt-2">Submit Request</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- STATE: PENDING APPROVAL ---
  if (stats?.account_status === "pending") {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center space-y-6 p-6">
        <div className="h-24 w-24 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <Clock className="h-12 w-12" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Verification Pending</h1>
          <p className="text-slate-500 mt-2">Your request has been sent to the hospital administrator.<br/>Please wait for their approval.</p>
        </div>
        <Button variant="outline" onClick={fetchDashboard} className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Check Status
        </Button>
      </div>
    );
  }

  // --- STATE: ACTIVE DASHBOARD ---
  return (
    <div className="space-y-8 p-1">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Medical Dashboard</h1>
          <p className="text-slate-500">Welcome back, Dr. {stats.doctor_name || "Doctor"}</p>
        </div>
        <Button variant="ghost" onClick={fetchDashboard} className="gap-2 text-blue-600 hover:bg-blue-50">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>
      
      {/* 1. INTERACTIVE STATS CARDS */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Appointments Card */}
        <Card 
          onClick={() => router.push("/doctor/schedule")}
          className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-blue-700">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.today_count}</div>
            <p className="text-xs text-slate-500 mt-1">Scheduled for today</p>
          </CardContent>
        </Card>

        {/* Patients Card */}
        <Card 
          onClick={() => router.push("/doctor/patients")}
          className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-purple-700">My Patients</CardTitle>
            <Users className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.total_patients}</div>
            <p className="text-xs text-slate-500 mt-1">Total unique records</p>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card 
          onClick={() => router.push("/doctor/finance")}
          className="border-l-4 border-l-green-500 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-green-700">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">${stats.revenue}</div>
            <p className="text-xs text-slate-500 mt-1">Generated this month</p>
          </CardContent>
        </Card>

        {/* Inventory Card (NEW) */}
        <Card 
          onClick={() => router.push("/doctor/inventory")}
          className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-orange-700">Inventory</CardTitle>
            <Package className="h-4 w-4 text-orange-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{inventoryCount}</div>
            <p className="text-xs text-slate-500 mt-1">Items in stock</p>
          </CardContent>
        </Card>

      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        
        {/* 2. TODAY'S SCHEDULE LIST */}
        <Card className="col-span-4 shadow-md bg-white border border-slate-200">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Clock className="h-5 w-5 text-blue-600" /> Today's Schedule
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/doctor/schedule")}>View All <ChevronRight className="h-4 w-4 ml-1"/></Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {stats.appointments.length === 0 ? (
                <div className="p-10 text-center text-slate-500 flex flex-col items-center">
                  <Calendar className="h-10 w-10 text-slate-300 mb-2" />
                  <p>No appointments scheduled for today.</p>
                </div>
              ) : (
                stats.appointments.map((appt: any, i: number) => (
                  <div 
                    key={i} 
                    onClick={() => router.push(`/doctor/patients/${appt.id}`)}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg border transition-colors ${
                        appt.status === 'completed' 
                          ? 'bg-green-100 text-green-600 border-green-200' 
                          : 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white'
                      }`}>
                        {appt.patient_name ? appt.patient_name.charAt(0) : 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">{appt.patient_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{appt.treatment}</span>
                          <span className="text-xs font-mono font-medium text-slate-700">{appt.time}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* ACTION BUTTON */}
                    <div>
                      {appt.status === "completed" ? (
                        <span className="flex items-center text-green-600 text-xs font-bold bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> COMPLETED
                        </span>
                      ) : (
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                          onClick={(e) => handleComplete(appt.id, e)}
                        >
                          <PlayCircle className="w-4 h-4 mr-1.5" /> Start
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. AI PANEL (Placeholder for now) */}
        <Card className="col-span-3 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-900">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              Smart Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-indigo-100 shadow-sm">
                <p className="text-sm text-indigo-900 font-bold mb-1 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Queue Optimization
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your schedule has <strong>{stats.today_count} patients</strong> today. 
                  Expected finish time: <strong>5:30 PM</strong> based on average treatment duration.
                </p>
              </div>
              
              <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-purple-100 shadow-sm">
                <p className="text-sm text-purple-900 font-bold mb-1 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Inventory Alert
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {inventoryCount < 5 
                    ? "⚠️ Stock is running low on some items. Check inventory." 
                    : "✅ Inventory levels look healthy for today's procedures."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}