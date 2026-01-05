"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { AuthAPI } from "@/lib/api";

export default function VerifyOTP() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 1. Retrieve the email saved during signup
    const saved = localStorage.getItem("pending_email");
    if (saved) {
      setEmail(saved.toLowerCase().trim());
    } else {
      // If no email found, redirect back to role selection
      router.push("/auth/role-selection");
    }
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 2. Call the API with the single object argument { email, otp }
      const res = await AuthAPI.verifyOtp({ email, otp: otp.trim() });
      
      setSuccess(true);
      const userRole = res.data.role; // Capture role from backend response

      setTimeout(() => {
        localStorage.removeItem("pending_email");
        
        // 3. Intelligent Redirect based on Role
        if (userRole === "organization") {
          alert("Account Verified! Please log in.");
          router.push("/auth/organization/login");
        } else if (userRole === "doctor") {
          alert("Account Verified! Please log in.");
          router.push("/auth/doctor/login");
        } else if (userRole === "patient") {
          alert("Verification Successful!");
          router.push("/auth/patient/login");
        } else {
          // Fallback
          router.push("/auth/login");
        }
      }, 1500);

    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Invalid OTP or Connection Error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            {success ? <CheckCircle2 className="text-green-600" /> : <KeyRound className="text-blue-600" />}
          </div>
          <CardTitle className="text-2xl font-bold">Verify Account</CardTitle>
          <CardDescription>Code sent to {email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <Input 
              className="text-center text-lg tracking-widest font-mono" 
              maxLength={6} 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              required 
              placeholder="123456"
            />
            <Button type="submit" className="w-full h-11" disabled={loading || success}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Verify & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}