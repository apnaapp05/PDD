"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { AuthAPI } from "@/lib/api";

export default function DoctorForgotPassword() {
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
      setError("Failed to process request. Please check email.");
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
      setError("Invalid OTP or request expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Recovery Portal</h2>
          <p className="text-sm text-slate-500 mt-2">Doctor Secure Access</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* STEP 1: EMAIL */}
        {step === "email" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <Input 
              label="Professional Email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5"/> : "Send Reset Code"}
            </Button>
            <div className="text-center mt-4">
              <Link href="/auth/doctor/login" className="text-xs text-indigo-600 font-medium hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: RESET */}
        {step === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="text-xs text-slate-500 text-center mb-4">
               Code sent to <strong>{email}</strong>
            </div>
            <Input 
              placeholder="Enter 6-digit OTP" 
              className="text-center tracking-widest"
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
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5"/> : "Update Password"}
            </Button>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === "success" && (
          <div className="text-center">
             <div className="flex justify-center mb-4">
               <CheckCircle2 className="h-12 w-12 text-green-500" />
             </div>
             <p className="text-slate-700 font-medium mb-6">Password updated successfully!</p>
             <Link href="/auth/doctor/login">
               <Button className="w-full bg-slate-900 text-white">Login Now</Button>
             </Link>
          </div>
        )}

      </div>
    </div>
  );
}