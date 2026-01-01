"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Upload, FileBadge, ShieldCheck, Loader2, AlertCircle, 
  Building2, Clock, ChevronDown, Mail, CheckCircle2 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthAPI } from "@/lib/api";

export default function DoctorSignup() {
  const router = useRouter();
  
  // Steps: 'form' -> 'otp' -> 'success'
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [otp, setOtp] = useState("");
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  
  // NEW: Hospital List State
  const [hospitals, setHospitals] = useState<any[]>([]);

  // Merged Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    hospital_select: "", 
    license_number: "", 
    specialization: "General Dentist",
    scheduleMode: "continuous" as "continuous" | "interleaved",
    workMinutes: "",
    breakMinutes: ""
  });

  // FETCH HOSPITALS ON MOUNT
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await AuthAPI.getVerifiedHospitals();
        setHospitals(res.data);
      } catch (err) {
        console.error("Failed to load hospitals", err);
      }
    };
    fetchHospitals();
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  // 1. REGISTER
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    if (!formData.hospital_select) {
      setError("Please select a valid hospital from the list.");
      setLoading(false);
      return;
    }

    try {
      await AuthAPI.register({
        email: formData.email,
        password: formData.password,
        full_name: `${formData.firstName} ${formData.lastName}`,
        role: "doctor",
        // Pass the selected hospital name
        hospital_name: formData.hospital_select,
        specialization: formData.specialization,
        license_number: formData.license_number,
        scheduling_config: {
          mode: formData.scheduleMode,
          work_duration: formData.workMinutes ? parseInt(formData.workMinutes) : null,
          break_duration: formData.breakMinutes ? parseInt(formData.breakMinutes) : null,
        }
      });

      setStep("otp"); 

    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // 2. VERIFY OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await AuthAPI.verifyOtp(formData.email, otp);
      setStep("success"); 
    } catch (err: any) {
      setError("Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER: OTP SCREEN ---
  if (step === "otp") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify Email</h2>
          <p className="text-slate-600 mb-6 text-sm">
            Enter the 6-digit code sent to <strong>{formData.email}</strong>
          </p>
          
          {error && <div className="mb-4 text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <Input 
              placeholder="000000" 
              className="text-center text-2xl tracking-[0.5em] font-mono h-14" 
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Verify Code"}
            </Button>
          </form>
          <div className="mt-8 p-3 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200 text-left">
            <strong>Demo Tip:</strong> Check your backend terminal for the OTP.
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: SUCCESS SCREEN ---
  if (step === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted</h2>
          <p className="text-slate-600 mb-6">
            Your email is verified. Your license is now being reviewed by the Admin. You will receive an email once approved.
          </p>
          <Link href="/auth/doctor/login">
            <Button variant="outline" className="w-full">Return to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  // --- RENDER: FORM ---
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side Branding */}
        <div className="bg-doctor p-8 md:w-1/3 text-white flex flex-col justify-between hidden md:flex">
          <div>
            <ShieldCheck className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-bold">Join Al-Shifa</h3>
            <p className="mt-4 text-doctor-light text-sm">
              We verify every practitioner to ensure patient trust.
            </p>
          </div>
          <div className="text-xs text-doctor-light/70">© 2025 Al-Shifa Clinical</div>
        </div>

        {/* Right Side Form */}
        <div className="p-8 md:w-2/3 overflow-y-auto max-h-[90vh]">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Doctor Registration</h2>
          <p className="text-sm text-slate-500 mb-6">Complete profile for verification.</p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center gap-2 border border-red-100">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleRegister}>
            {/* Personal Details */}
            <div className="space-y-3">
               <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal Details</h3>
               <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" name="firstName" onChange={handleChange} required />
                  <Input label="Last Name" name="lastName" onChange={handleChange} required />
               </div>
               <Input label="Professional Email" type="email" name="email" onChange={handleChange} required />
               <Input label="Password" type="password" name="password" onChange={handleChange} required />
            </div>

            <hr className="border-slate-100" />

            {/* Professional Info */}
            <div className="space-y-3">
               <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credentials</h3>
               
               <div className="space-y-1">
                 <label className="text-sm font-medium text-slate-700">Hospital / Clinic</label>
                 <div className="relative">
                   <select 
                     name="hospital_select"
                     className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 outline-none"
                     onChange={handleChange}
                     value={formData.hospital_select}
                   >
                     <option value="">Select verified hospital...</option>
                     {/* DYNAMIC LIST */}
                     {hospitals.map((h) => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                 </div>
                 
                 {/* REDIRECT LINK */}
                 <div className="mt-2 text-right">
                   <Link 
                     href="/auth/organization/signup" 
                     className="text-xs text-doctor font-medium hover:underline flex items-center justify-end gap-1 text-indigo-600"
                   >
                     Hospital not listed? Register Clinic <Building2 className="h-3 w-3" />
                   </Link>
                 </div>
               </div>

               <Input label="License Number" name="license_number" placeholder="PMC-12345" onChange={handleChange} required />
            </div>

            <Button variant="doctor" className="w-full mt-4" size="lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5"/> : "Next: Verify Identity"}
            </Button>
          </form>
          
          <p className="mt-6 text-center text-xs text-slate-500">
            Already registered? <Link href="/auth/doctor/login" className="text-doctor font-bold underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}