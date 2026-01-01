"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, AlertCircle, Smile, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { AuthAPI } from "@/lib/api";

export default function PatientSignup() {
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    age: "",
    gender: "Male"
  });

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await AuthAPI.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        role: "patient",
        age: parseInt(formData.age),
        gender: formData.gender
      });
      setStep("otp");
    } catch (err: any) {
      console.error(err);
      setError("Registration failed. Email might be taken.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await AuthAPI.verifyOtp(formData.email, otp);
      setStep("success");
    } catch (err) {
      setError("Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-teal-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Verify Email</h2>
          <p className="text-slate-600 mb-6 text-sm mt-2">Enter code sent to {formData.email}</p>
          {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <Input className="text-center text-2xl h-14" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} />
            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-4 w-4"/> : "Verify & Activate"}
            </Button>
          </form>
          <div className="mt-6 text-xs text-slate-400">Tip: Check backend terminal for OTP</div>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Welcome to Al-Shifa!</h2>
          <p className="text-slate-600 mb-6 mt-2">Your account is fully active. You can now book appointments.</p>
          <Link href="/auth/patient/login">
            <Button className="w-full bg-teal-600 hover:bg-teal-700">Login Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border-t-4 border-teal-500">
        <div className="text-center mb-8">
           <Smile className="h-10 w-10 text-teal-600 mx-auto mb-2" />
           <h2 className="text-2xl font-bold text-slate-900">Patient Registration</h2>
        </div>

        {error && <div className="mb-4 p-2 bg-red-50 text-red-600 text-sm rounded">{error}</div>}

        <form className="space-y-4" onSubmit={handleRegister}>
          <Input label="Full Name" name="fullName" onChange={handleChange} required />
          <Input label="Email" type="email" name="email" onChange={handleChange} required />
          <Input label="Password" type="password" name="password" onChange={handleChange} required />
          
          <div className="grid grid-cols-2 gap-4">
             <Input label="Age" type="number" name="age" onChange={handleChange} required />
             <div className="space-y-1">
               <label className="text-sm font-medium text-slate-700">Gender</label>
               <select name="gender" onChange={handleChange} className="w-full p-2 border rounded-md bg-white text-sm">
                 <option value="Male">Male</option>
                 <option value="Female">Female</option>
               </select>
             </div>
          </div>

          <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" size="lg" disabled={loading}>
            {loading ? <Loader2 className="animate-spin h-5 w-5"/> : "Create Account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
           Existing patient? <Link href="/auth/patient/login" className="text-teal-600 font-bold">Login</Link>
        </p>
      </div>
    </div>
  );
}