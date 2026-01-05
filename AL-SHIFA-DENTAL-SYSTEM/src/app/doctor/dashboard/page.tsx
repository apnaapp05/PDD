"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, AlertTriangle, Clock, Calendar, RefreshCcw, Stethoscope } from "lucide-react";
import { DoctorAPI, AuthAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DoctorDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Join State
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
      const response = await DoctorAPI.getDashboardStats();
      setStats(response.data);
      
      if (response.data.account_status === "no_profile") {
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

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  if (stats?.account_status === "no_profile") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 mt-10">
        <Card className="border-l-4 border-l-yellow-500 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-6 w-6" /> Action Required: Join an Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">Please select a hospital to join.</p>
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

  if (stats?.account_status === "pending") {
    return (
      <div className="max-w-2xl mx-auto mt-10 text-center space-y-4">
        <div className="h-20 w-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto">
          <Clock className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Verification Pending</h1>
        <Button variant="outline" onClick={fetchDashboard}>Check Status</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <button onClick={fetchDashboard} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Appointments (Today)</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today_count}</div>
            <p className="text-xs text-slate-500">Scheduled for today</p>
          </CardContent>
        </Card>
        {/* Other Cards Omitted for brevity, they remain same */}
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Left: Today's Appointments List */}
        <Card className="col-span-4 shadow-md bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" /> Today's Schedule
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
                  <div 
                    key={i} 
                    onClick={() => router.push(`/doctor/patients/${patient.id}`)}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {patient.patient_name ? patient.patient_name.charAt(0) : 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">{patient.patient_name}</p>
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

        {/* AI Panel Preserved */}
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
                  No critical alerts at this moment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}