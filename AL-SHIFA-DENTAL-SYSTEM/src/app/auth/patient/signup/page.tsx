"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, AlertCircle } from "lucide-react";
import Link from "next/link";
import { AuthAPI } from "@/lib/api";

export default function PatientSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    gender: "",
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!formData.age || !formData.gender) {
      setError("Please select age and gender");
      return;
    }

    setLoading(true);

    try {
      // 1. Register API Call
      await AuthAPI.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.name,
        role: "patient",
        // Specific fields for Patient Profile
        age: parseInt(formData.age),
        gender: formData.gender
      });

      // 2. Success: Save email for the OTP page
      localStorage.setItem("pending_email", formData.email);
      
      // 3. Redirect to the Global OTP Page
      router.push("/auth/verify-otp");

    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Patient Registration</CardTitle>
          <CardDescription>Create an account to book appointments</CardDescription>
        </CardHeader>
        <CardContent>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center gap-2 border border-red-100">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                required 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="patient@example.com" 
                required 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input 
                  id="age" 
                  type="number" 
                  placeholder="25" 
                  required 
                  min="1"
                  onChange={(e) => setFormData({...formData, age: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select onValueChange={(val) => setFormData({...formData, gender: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input 
                  id="confirm" 
                  type="password" 
                  required 
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-2" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Create Account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Already have an account? <Link href="/auth/patient/login" className="text-blue-600 font-bold hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}