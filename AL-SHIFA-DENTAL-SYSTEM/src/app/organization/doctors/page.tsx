"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Stethoscope } from "lucide-react";
import { OrganizationAPI } from "@/lib/api";
import { Input } from "@/components/ui/input";

export default function OrgDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await OrganizationAPI.getDoctors();
        setDoctors(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Management</h1>
          <p className="text-sm text-slate-500">Manage medical staff and permissions</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add New Doctor
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2">
        <Search className="h-5 w-5 text-slate-400" />
        <Input placeholder="Search doctors by name or license..." className="border-none shadow-none focus-visible:ring-0" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-slate-500 p-4">Loading staff data...</p>
        ) : doctors.length === 0 ? (
          <p className="text-slate-500 p-4 col-span-full text-center">No doctors registered yet.</p>
        ) : (
          doctors.map((doc: any) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Stethoscope className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{doc.name}</h3>
                  <p className="text-sm text-blue-600 font-medium">{doc.specialization}</p>
                  <p className="text-xs text-slate-400 mt-1">Lic: {doc.license}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}