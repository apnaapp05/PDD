"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smile, Loader2, AlertCircle } from "lucide-react";
import { AuthAPI } from "@/lib/api";

export default function PatientLogin() {
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
      localStorage.setItem("role", "patient");
      
      window.location.href = "/patient/dashboard";
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((e: any) => e.msg).join(", "));
      else if (typeof detail === "object") setError(detail.msg || "Error occurred");
      else if (err.response?.status === 401) setError("Invalid credentials.");
      else setError("Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
            <Smile className="h-6 w-6" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patient Portal</h1>
        <p className="text-slate-500 text-sm">View your history and appointments</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">Email</label>
          <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">Password</label>
          <Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
        </div>

        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <Link href="/auth/patient/signup" className="text-emerald-600 hover:underline font-medium">Create Patient Account</Link>
      </div>
    </div>
  );
}