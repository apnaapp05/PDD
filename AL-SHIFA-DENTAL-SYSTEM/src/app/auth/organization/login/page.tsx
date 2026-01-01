"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Loader2, AlertCircle } from "lucide-react";
import { AuthAPI } from "@/lib/api";

export default function OrganizationLogin() {
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

      // Check Role
      const role = response.data.role;
      if (role !== "organization" && role !== "admin") {
        setError("Access Denied: This account is not authorized.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("role", role);
      
      router.push("/organization/dashboard");

    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError(err.response.data.detail || "Invalid credentials.");
      } else {
        setError("Connection failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          Organization Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Manage clinic operations and staff
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-blue-600">
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <Input 
              label="Organization Email" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input 
              label="Password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* FORGOT PASSWORD LINK */}
            <div className="flex items-center justify-end">
              <Link 
                href="/auth/organization/forgot-password" 
                className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5"/> : "Access Dashboard"}
            </Button>
          </form>

          <div className="mt-6 text-center">
             <p className="text-sm text-slate-500">
               New Clinic? <Link href="/auth/organization/signup" className="text-blue-600 font-medium hover:underline">Register your organization</Link>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}