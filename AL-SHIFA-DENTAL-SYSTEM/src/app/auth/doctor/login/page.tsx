"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stethoscope, Loader2, AlertCircle } from "lucide-react";
import { AuthAPI } from "@/lib/api";

export default function DoctorLogin() {
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
      localStorage.setItem("role", "doctor");
      
      // Force hard reload to clear any stale state
      window.location.href = "/doctor/dashboard";
    } catch (err: any) {
      console.error("Login error:", err);
      // ROBUST ERROR HANDLING
      const detail = err.response?.data?.detail;
      
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        // Handle Pydantic array errors
        setError(detail.map((e: any) => e.msg).join(", "));
      } else if (typeof detail === "object") {
        // Handle single object error
        setError(detail.msg || "Validation error occurred.");
      } else if (err.response?.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <Stethoscope className="h-6 w-6" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Doctor Login</h1>
        <p className="text-slate-500 text-sm">Access your patients and appointments</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">Email Address</label>
          <Input 
            type="email" 
            placeholder="doctor@hospital.com" 
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">Password</label>
          <Input 
            type="password" 
            placeholder="••••••••" 
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <Button className="w-full bg-blue-600 hover:bg-blue-700 font-bold" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
        </Button>
      </form>

      <div className="text-center text-sm space-y-2">
        <Link href="/auth/doctor/signup" className="text-blue-600 hover:underline font-medium">
          Apply for a new account
        </Link>
        <div className="text-slate-400 text-xs">
          Forgot password? Contact admin.
        </div>
      </div>
    </div>
  );
}