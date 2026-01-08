"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { AuthAPI } from "@/lib/api";

export default function AdminLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await AuthAPI.login(form.email, form.password);
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("role", "admin");
      window.location.href = "/admin/dashboard";
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((e: any) => e.msg).join(", "));
      else if (typeof detail === "object") setError(detail.msg || "Error occurred");
      else setError("Access Denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 bg-slate-800 rounded-full flex items-center justify-center text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Admin</h1>
        <p className="text-slate-500 text-sm">Platform Management Only</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded flex items-center gap-2"><AlertCircle className="h-4 w-4"/> {error}</div>}
        
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">Email</label>
          <Input type="email" placeholder="admin@system" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">Password</label>
          <Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
        </div>

        <Button className="w-full bg-slate-900 hover:bg-slate-800 font-bold" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authenticate"}
        </Button>
      </form>
    </div>
  );
}