"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, Calendar, TrendingUp, Clock, 
  ChevronRight, RefreshCcw, Loader2, Sparkles, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SmartAssistant from "@/components/chat/SmartAssistant"; 

export default function DoctorDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Live Data Fetching
  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/doctor/dashboard");
      setStats(res.data);
    } catch (e) {
      console.error("Failed to fetch dashboard", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Safe Accessors
  const appointmentList = stats?.schedule || [];
  const revenueDisplay = stats?.monthly_revenue || 0;
  const patientCount = stats?.total_patients || 0;
  const nextApptTime = stats?.next_appointment || "None";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Welcome back, {stats?.doctor_name || "Doctor"}
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            You have <span className="font-bold text-emerald-600">{stats?.today_count || 0} appointments</span> today.
          </p>
        </div>
        <div className="flex gap-3">
           <Button 
             variant="outline" 
             size="sm" 
             onClick={fetchDashboard} 
             disabled={refreshing}
             className="border-slate-200 text-slate-600 hover:bg-slate-50"
           >
             <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
             Refresh
           </Button>
           <Link href="/doctor/schedule">
             <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
               View Full Calendar
             </Button>
           </Link>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Est. Revenue</p>
                <h3 className="text-3xl font-black text-slate-900 mt-2">
                  {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(revenueDisplay)}
                </h3>
              </div>
              <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <TrendingUp size={24} />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 font-medium flex items-center gap-1">
               <span className="text-emerald-600">↑ 5%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Patients</p>
                <h3 className="text-3xl font-black text-slate-900 mt-2">
                  {patientCount}
                </h3>
              </div>
              <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Users size={24} />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Active care plans</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Next Patient</p>
                <h3 className="text-3xl font-black text-slate-900 mt-2">
                  {nextApptTime}
                </h3>
              </div>
              <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Clock size={24} />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Check patient notes</p>
          </CardContent>
        </Card>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 border-slate-200 shadow-sm overflow-hidden h-fit bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <Calendar className="w-5 h-5 text-slate-500" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {appointmentList.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                <div className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                    <Calendar className="h-6 w-6 text-slate-300" />
                </div>
                <p>No appointments for today. Enjoy your break! ☕</p>
                <Link href="/doctor/schedule">
                    <Button variant="link" className="text-emerald-600 font-bold">Check Full Calendar</Button>
                </Link>
              </div>
            ) : (
              appointmentList.map((appt: any, i: number) => {
                const [timeVal, timeMeridiem] = appt.time ? appt.time.split(' ') : ["--:--", ""];
                return (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-14 rounded-lg bg-white flex flex-col items-center justify-center text-slate-600 border border-slate-200 group-hover:border-emerald-200 group-hover:text-emerald-700 transition-colors shadow-sm">
                        <span className="text-sm font-bold">{timeVal}</span>
                        <span className="text-[10px] uppercase font-medium text-slate-400">{timeMeridiem}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {appt.patient_name}
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            {appt.type || "General Visit"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className={
                            appt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }>
                            {appt.status}
                        </Badge>
                        <Button size="icon" variant="ghost" className="text-slate-400 hover:text-emerald-600">
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* RIGHT SIDE: Quick Actions */}
        <div className="md:col-span-3 space-y-6">
            <Card className="border-0 shadow-xl bg-slate-900 text-white relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <CardHeader className="border-b border-white/10 pb-4">
                    <CardTitle className="flex items-center gap-2 text-white text-lg">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    AI Assistant Active
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 relative z-10">
                    <p className="text-sm text-slate-300">
                      I am monitoring your schedule and inventory. I will analyze your dashboard and provide insights automatically.
                    </p>
                </CardContent>
            </Card>

            {/* Inventory Alerts */}
            {stats?.inventory_alerts && stats.inventory_alerts.length > 0 && (
                <Card className="border-amber-200 bg-amber-50 shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4 border-b border-amber-100/50">
                        <CardTitle className="flex items-center gap-2 text-amber-800 text-sm font-bold">
                            <AlertTriangle className="w-4 h-4" /> Low Stock Alerts
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        {stats.inventory_alerts.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm">
                                <span className="font-bold text-slate-700">{item.name}</span>
                                <span className="text-red-600 font-black bg-red-50 px-2 py-0.5 rounded text-[10px]">
                                    Only {item.qty} left
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
      </div>

      {/* 🟣 SMART ASSISTANT WITH DASHBOARD CONTEXT */}
      <SmartAssistant 
        role="doctor" 
        pageName="Dashboard" 
        pageContext={stats} 
      />
      
    </div>
  );
}