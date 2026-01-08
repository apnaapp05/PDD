"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { DoctorAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { User, FileText, Activity, Plus, Save, Upload, File as FileIcon, Download, Loader2 } from "lucide-react";

export default function PatientDetails() {
  const { id } = useParams();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [record, setRecord] = useState({ diagnosis: "", prescription: "", notes: "" });
  const [files, setFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDetails = async () => {
    try {
      const res = await DoctorAPI.getPatientDetails(Number(id));
      setPatient(res.data);
      // If the backend returns files, set them (Assuming updated backend returns 'files' list)
      if (res.data.files) setFiles(res.data.files);
    } catch (error) {
      console.error("Error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetails(); }, [id]);

  const handleAddRecord = async () => {
    if (!record.diagnosis) return alert("Diagnosis required");
    try {
      await DoctorAPI.addMedicalRecord(Number(id), record);
      alert("Record Saved");
      setRecord({ diagnosis: "", prescription: "", notes: "" });
      fetchDetails();
    } catch (e) { alert("Failed to save record"); }
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      await DoctorAPI.uploadPatientFile(Number(id), formData);
      alert("File uploaded!");
      fetchDetails(); // Refresh to see new file
    } catch (err) { alert("File upload failed."); }
    finally { if(fileInputRef.current) fileInputRef.current.value = ""; }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline"/> Loading...</div>;
  if (!patient) return <div className="p-20 text-center">Patient not found</div>;

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-none">
        <CardContent className="p-8 flex items-center gap-6">
          <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
            <User className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{patient.full_name}</h1>
            <div className="flex gap-4 mt-2 text-blue-100">
              <span>Age: {patient.age || "N/A"}</span>
              <span>•</span>
              <span>Gender: {patient.gender || "N/A"}</span>
              <span>•</span>
              <span>ID: #{patient.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="history">Medical History</TabsTrigger>
          <TabsTrigger value="new">Add Record</TabsTrigger>
          <TabsTrigger value="files">Documents</TabsTrigger>
        </TabsList>

        {/* 1. HISTORY TAB */}
        <TabsContent value="history" className="space-y-4 mt-4">
          {patient.history?.length === 0 ? (
            <Card className="p-8 text-center text-slate-500"><p>No medical history found.</p></Card>
          ) : (
            patient.history.map((rec: any, i: number) => (
              <Card key={i}>
                <CardHeader className="bg-slate-50 border-b pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600"/> {rec.diagnosis}
                    </CardTitle>
                    <span className="text-xs text-slate-500">{rec.date} • Dr. {rec.doctor_name}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400">Prescription</span>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{rec.prescription}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* 2. ADD RECORD TAB */}
        <TabsContent value="new" className="mt-4">
          <Card>
            <CardHeader><CardTitle>New Consultation Record</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Diagnosis / Condition</label>
                <Input placeholder="e.g. Acute Pulpitis" value={record.diagnosis} onChange={e=>setRecord({...record, diagnosis: e.target.value})}/>
              </div>
              <div>
                <label className="text-sm font-medium">Prescription & Notes</label>
                <Textarea placeholder="Medications, dosage, instructions..." className="h-32" value={record.prescription} onChange={e=>setRecord({...record, prescription: e.target.value})}/>
              </div>
              <Button onClick={handleAddRecord} className="w-full bg-blue-600 hover:bg-blue-700"><Save className="mr-2 h-4 w-4"/> Save Record</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. FILES TAB (NEW) */}
        <TabsContent value="files" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Patient Documents</CardTitle>
              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload File
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-10 text-slate-400 border-2 border-dashed rounded-xl">
                  <FileIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>No documents uploaded (X-rays, Lab Reports, etc)</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {files.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-900 truncate">{f.filename}</p>
                          <p className="text-xs text-slate-500">{f.date}</p>
                        </div>
                      </div>
                      <a href={`http://localhost:8000/${f.path}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon"><Download className="h-4 w-4 text-slate-500"/></Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}