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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await AuthAPI.login(email, password);
      if (response.data.role !== "doctor") {
        setError("Access Denied: Not a Doctor account.");
        setLoading(false);
        return;
      }
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("role", response.data.role);
      router.push("/doctor/dashboard");

    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail) {
        setError(detail);
      } else if (err.response?.status === 401) {
        setError("Invalid credentials.");
      } else {
        setError("Login failed. Please check connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
            <Stethoscope className="h-6 w-6 text-indigo-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-slate-900">Doctor Portal</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-indigo-600">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleLogin}>
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            
            {/* FORGOT PASSWORD LINK */}
            <div className="flex items-center justify-end">
              <Link 
                href="/auth/doctor/forgot-password" 
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" size="lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5"/> : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link href="/auth/doctor/signup">
              <Button variant="outline" className="w-full border-slate-300">Apply for Verification</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}