"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, MapPin, Save, Loader2, CheckCircle2 } from "lucide-react";
import { AuthAPI } from "@/lib/api";

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone_number: "",
    address: ""
  });

  const [initials, setInitials] = useState("U");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await AuthAPI.getMe();
        const data = res.data;
        
        // Split full name for UI
        const parts = (data.full_name || "").split(" ");
        const first = parts[0] || "";
        const last = parts.slice(1).join(" ") || "";
        
        setFormData({
          firstName: first,
          lastName: last,
          email: data.email || "",
          phone_number: data.phone_number || "",
          address: data.address || ""
        });

        // Set Initials
        setInitials((first[0] || "") + (last[0] || ""));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await AuthAPI.updateProfile({
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone_number: formData.phone_number,
        address: formData.address
      });
      setMessage("Profile updated successfully!");
      // Update initials
      setInitials((formData.firstName[0] || "") + (formData.lastName[0] || ""));
    } catch (err) {
      setMessage("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
      
      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1 text-center h-fit">
          <CardContent className="pt-6">
            <div className="h-32 w-32 rounded-full bg-slate-200 mx-auto flex items-center justify-center text-4xl text-slate-500 font-bold mb-4 relative border-4 border-white shadow-lg">
              {initials.toUpperCase()}
              <span className="absolute bottom-0 right-0 h-8 w-8 bg-blue-500 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                <User className="h-4 w-4 text-white" />
              </span>
            </div>
            <h2 className="text-xl font-bold">{formData.firstName} {formData.lastName}</h2>
            <p className="text-slate-500 text-sm mt-1">{formData.email}</p>
            <Button variant="outline" className="mt-6 w-full" disabled>Change Photo</Button>
            <p className="text-[10px] text-slate-400 mt-2">Photo upload coming soon</p>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className={`p-3 rounded text-sm flex items-center gap-2 ${message.includes("Failed") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                <CheckCircle2 className="h-4 w-4" /> {message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">First Name</label>
                <Input name="firstName" value={formData.firstName} onChange={handleChange} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Last Name</label>
                <Input name="lastName" value={formData.lastName} onChange={handleChange} />
              </div>
            </div>
            
            <div>
               <label className="text-sm font-medium text-slate-700 mb-1 block">Email Address</label>
               <div className="relative">
                 <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                 <Input name="email" value={formData.email} onChange={handleChange} className="pl-9" />
               </div>
            </div>

            <div>
               <label className="text-sm font-medium text-slate-700 mb-1 block">Phone Number</label>
               <div className="relative">
                 <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                 <Input name="phone_number" value={formData.phone_number} onChange={handleChange} className="pl-9" placeholder="+92 300..." />
               </div>
            </div>

            <div>
               <label className="text-sm font-medium text-slate-700 mb-1 block">Address</label>
               <div className="relative">
                 <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                 <Input name="address" value={formData.address} onChange={handleChange} className="pl-9" placeholder="Street Address..." />
               </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <Button onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800" disabled={saving}>
                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />} 
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}