"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic"; // Import dynamic loader
import LocationSummary from "@/components/location/LocationSummary";
import { Badge } from "@/components/ui/badge"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Edit, Save, X, Loader2, Mail, Phone, MapPin, AlertTriangle, Send } from "lucide-react";
import { AuthAPI, OrganizationAPI } from "@/lib/api";

// --- DYNAMIC MAP IMPORT (Fixes SSR Error) ---
const LocationPicker = dynamic(
  () => import("@/components/location/LocationPicker"),
  { 
    loading: () => (
      <div className="h-[350px] w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400 text-sm">
        <Loader2 className="animate-spin mr-2 h-4 w-4" /> Loading Map...
      </div>
    ),
    ssr: false // This disables server-side rendering for the map
  }
);

export default function OrgProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Data State
  const [hospitalDetails, setHospitalDetails] = useState<any>({});
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    // Location Data
    address: "",
    pincode: "",
    lat: 0,
    lng: 0
  });

  // Helper to check if location is modified
  const isLocationChanged = 
    formData.address !== (hospitalDetails.address || "") || 
    formData.lat !== (hospitalDetails.lat || 0);

  // Fetch Data on Load
  const loadProfile = async () => {
    try {
      const userRes = await AuthAPI.getMe();
      const hospRes = await OrganizationAPI.getDetails();
      
      setHospitalDetails(hospRes.data);
      
      setFormData({
        name: userRes.data.full_name || "",
        email: userRes.data.email || "",
        phone: userRes.data.phone_number || "",
        address: hospRes.data.address || "",
        pincode: hospRes.data.pincode || "",
        lat: hospRes.data.lat || 0,
        lng: hospRes.data.lng || 0
      });

    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLocationChange = (loc: any) => {
    setFormData(prev => ({
      ...prev,
      address: loc.address,
      pincode: loc.pincode,
      lat: loc.lat,
      lng: loc.lng
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update Basic Info
      await AuthAPI.updateProfile({
        full_name: formData.name,
        email: formData.email,
        phone_number: formData.phone,
        address: formData.address 
      });

      // 2. Handle Location Change
      if (isLocationChanged) {
        // SAFE: Convert lat/lng to float
        await OrganizationAPI.requestLocationChange({
           address: formData.address,
           pincode: formData.pincode,
           lat: parseFloat(String(formData.lat || 0)),
           lng: parseFloat(String(formData.lng || 0))
        });
        alert("Success! Location sent to Admin for approval.");
      } else {
        alert("Profile updated successfully.");
      }

      await loadProfile(); 
      setIsEditing(false);

    } catch (err: any) {
      console.error("Profile Update Error:", err);
      // SHOW EXACT SERVER ERROR
      const errorMessage = err.response?.data?.detail || "Failed to update profile.";
      
      // If validation error (422), show details
      if (err.response?.status === 422 && Array.isArray(err.response?.data?.detail)) {
         const fields = err.response.data.detail.map((e: any) => e.loc.join(".")).join(", ");
         alert(`Validation Error in fields: ${fields}`);
      } else {
         alert(`Error: ${errorMessage}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* PENDING ALERT */}
      {hospitalDetails.pending_address && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-bold text-yellow-800 text-sm">Location Verification Pending</h4>
            <p className="text-xs text-yellow-700 mt-1">
              Pending Address: <strong>{hospitalDetails.pending_address}</strong>. 
              Waiting for Admin Approval.
            </p>
          </div>
        </div>
      )}

      {/* HEADER & ACTIONS */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Hospital Profile</h1>
        
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" /> Edit Details
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            
            {/* DYNAMIC BUTTON */}
            {isLocationChanged ? (
              <Button 
                size="sm" 
                onClick={handleSave} 
                disabled={saving} 
                className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
              >
                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send for Approval
              </Button>
            ) : (
              <Button 
                size="sm" 
                onClick={handleSave} 
                disabled={saving} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            )}
          </div>
        )}
      </div>

      {/* MAIN CARD */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="h-20 w-20 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
            <Building2 className="h-10 w-10" />
          </div>

          <div className="flex-1 w-full space-y-4">
            
            {/* NAME */}
            <div>
              {isEditing ? (
                <div className="mb-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Hospital Name</label>
                  <Input name="name" value={formData.name} onChange={handleChange} className="max-w-md" />
                </div>
              ) : (
                <h2 className="text-2xl font-bold text-slate-900">{formData.name}</h2>
              )}

              <div className="flex items-center gap-2 mt-1">
                 <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Verified
                 </Badge>
                 <span className="text-xs text-slate-400">ID: {hospitalDetails.id}</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* CONTACT */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1 mb-1">
                  <Mail className="h-3 w-3" /> Official Email
                </label>
                {isEditing ? (
                  <Input name="email" value={formData.email} onChange={handleChange} />
                ) : (
                  <p className="text-sm font-medium text-slate-900">{formData.email}</p>
                )}
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1 mb-1">
                  <Phone className="h-3 w-3" /> Phone Number
                </label>
                {isEditing ? (
                  <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+92..." />
                ) : (
                  <p className="text-sm font-medium text-slate-900">{formData.phone || "Not set"}</p>
                )}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* LOCATION */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1 mb-2">
                 <MapPin className="h-3 w-3" /> Address & Location
              </label>
              
              {isEditing ? (
                <div className="py-2 border border-blue-100 rounded bg-blue-50/50 p-3">
                  <p className="text-xs text-blue-600 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" />
                    <strong>Note:</strong> Changing location requires Admin Approval.
                  </p>
                  
                  {/* Dynamic Map Component */}
                  <LocationPicker 
                    onChange={handleLocationChange} 
                    initialData={{
                      address: formData.address,
                      pincode: formData.pincode,
                      lat: formData.lat,
                      lng: formData.lng
                    }}
                  />
                  
                </div>
              ) : (
                <LocationSummary address={formData.address || "No address provided"} pincode={formData.pincode} />
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}