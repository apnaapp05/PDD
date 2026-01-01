"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldQuestion, CheckCircle2, AlertCircle } from "lucide-react";
import { AuthAPI } from "@/lib/api";

export default function OrgForgotPassword() {
  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await AuthAPI.forgotPassword(email);
      setStep("reset");
    } catch (err) {
      setError("Failed to verify organization email.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await AuthAPI.resetPassword(email, otp, password);
      setStep("success");
    } catch (err) {
      setError("Invalid OTP or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <ShieldQuestion className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Admin Recovery</h2>
          <p className="text-sm text-slate-500 mt-2">Reset Organization Access</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <Input 
              label="Organization Email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5"/> : "Request OTP"}
            </Button>
            <div className="text-center mt-4">
              <Link href="/auth/organization/login" className="text-xs text-blue-600 font-medium hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="text-xs text-slate-500 text-center mb-4">Code sent to {email}</div>
            <Input 
              placeholder="6-Digit OTP" 
              className="text-center"
              maxLength={6}
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              required 
            />
            <Input 
              label="New Password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5"/> : "Securely Reset"}
            </Button>
          </form>
        )}

        {step === "success" && (
          <div className="text-center">
             <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
             <p className="text-slate-700 font-medium mb-6">Credentials Updated.</p>
             <Link href="/auth/organization/login">
               <Button className="w-full bg-slate-900 text-white">Login to Portal</Button>
             </Link>
          </div>
        )}

      </div>
    </div>
  );
}