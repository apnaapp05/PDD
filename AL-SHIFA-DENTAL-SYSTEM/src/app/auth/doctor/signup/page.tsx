"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShieldCheck, Loader2, AlertCircle, 
  Building2, ChevronDown
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthAPI } from "@/lib/api";

export default function DoctorSignup() {
  const router = useRouter();
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Hospital List State
  const [hospitals, setHospitals] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    hospital_select: "", 
    license_number: "", 
    specialization: "General Dentist",
    scheduleMode: "continuous", // Kept for UI, though backend might not use it yet
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

  // REGISTER FUNCTION
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
        // Mapping 'hospital_select' to what backend expects ('hospital_name')
        hospital_name: formData.hospital_select,
        specialization: formData.specialization,
        license_number: formData.license_number,
        // We pass this, but backend schema must support it to be saved
        scheduling_config: {
          mode: formData.scheduleMode,
          work_duration: formData.workMinutes ? parseInt(formData.workMinutes) : null,
          break_duration: formData.breakMinutes ? parseInt(formData.breakMinutes) : null,
        }
      });

      // SUCCESS: Save email and Redirect to Global OTP Page
      localStorage.setItem("pending_email", formData.email);
      router.push("/auth/verify-otp");

    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER FORM ---
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side Branding */}
        <div className="bg-blue-600 p-8 md:w-1/3 text-white flex flex-col justify-between hidden md:flex">
          <div>
            <ShieldCheck className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-bold">Join Al-Shifa</h3>
            <p className="mt-4 text-blue-100 text-sm">
              We verify every practitioner to ensure patient trust.
            </p>
          </div>
          <div className="text-xs text-blue-200">© 2025 Al-Shifa Clinical</div>
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
                  {/* Using standard inputs instead of custom component if not available, else revert to Input component */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">First Name</label>
                    <Input name="firstName" onChange={handleChange} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Last Name</label>
                    <Input name="lastName" onChange={handleChange} required />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <Input type="email" name="email" onChange={handleChange} required />
               </div>
               <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <Input type="password" name="password" onChange={handleChange} required />
               </div>
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
                     className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 outline-none appearance-none"
                     onChange={handleChange}
                     value={formData.hospital_select}
                   >
                     <option value="">Select verified hospital...</option>
                     {hospitals.map((h) => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                 </div>
                 
                 <div className="mt-2 text-right">
                   <Link 
                     href="/auth/organization/signup" 
                     className="text-xs font-medium hover:underline flex items-center justify-end gap-1 text-indigo-600"
                   >
                     Hospital not listed? Register Clinic <Building2 className="h-3 w-3" />
                   </Link>
                 </div>
               </div>

               <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">License Number</label>
                  <Input name="license_number" placeholder="PMC-12345" onChange={handleChange} required />
               </div>
            </div>

            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" size="lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5"/> : "Next: Verify Identity"}
            </Button>
          </form>
          
          <p className="mt-6 text-center text-xs text-slate-500">
            Already registered? <Link href="/auth/doctor/login" className="text-blue-600 font-bold underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}