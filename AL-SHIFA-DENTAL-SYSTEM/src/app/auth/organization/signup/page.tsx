"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, MapPin } from "lucide-react";
import { AuthAPI } from "@/lib/api";

// Use dynamic import to fix SSR issues with the map
const LocationPicker = dynamic(() => import("@/components/location/LocationPicker"), { 
  ssr: false, 
  loading: () => <div className="h-[300px] w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">Loading Map...</div> 
});

export default function OrgSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", confirmPassword: "", address: "", pincode: "", lat: 17.3850, lng: 78.4867
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return alert("Passwords do not match");
    setLoading(true);
    try {
      await AuthAPI.register({
        email: formData.email, password: formData.password, full_name: formData.name,
        role: "organization", address: formData.address, pincode: formData.pincode, lat: formData.lat, lng: formData.lng
      });
      localStorage.setItem("pending_email", formData.email);
      router.push("/auth/verify-otp");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-blue-600" />
          <CardTitle>Register Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Input placeholder="Hospital Name" required onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <Input placeholder="Official Email" type="email" required onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input placeholder="Password" type="password" required onChange={(e) => setFormData({...formData, password: e.target.value})} />
              <Input placeholder="Confirm Password" type="password" required onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>
            <div className="space-y-4">
              <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Clinic Location</Label>
              <LocationPicker initialData={formData} onChange={(loc) => setFormData(prev => ({ ...prev, ...loc }))} />
              <Input placeholder="Detected Address" value={formData.address} readOnly />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Create Account"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}