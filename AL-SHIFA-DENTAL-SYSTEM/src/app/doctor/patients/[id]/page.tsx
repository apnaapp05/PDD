import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Activity, Syringe, Clock, AlertCircle } from "lucide-react";

export default function PatientDetail({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      
      {/* Patient Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start">
        <div className="flex gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-500">
            AK
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ali Khan</h1>
            <p className="text-sm text-slate-500">Male, 34 Years • MRN: #89201</p>
            <div className="flex gap-2 mt-2">
              <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded border border-red-100 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Allergy: Penicillin
              </span>
              <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded border border-blue-100">
                Diabetic
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline">Edit Profile</Button>
           <Button variant="doctor">Start Session</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Left: Medical Timeline (Storytelling UI) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-doctor" /> Clinical History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pl-8 py-2">
              
              {/* Timeline Item 1 */}
              <div className="relative">
                <span className="absolute -left-[41px] top-1 h-5 w-5 rounded-full bg-green-500 border-4 border-white shadow-sm"></span>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-slate-900">Root Canal Treatment (Completed)</h3>
                  <span className="text-xs text-slate-400">12 Dec 2024</span>
                </div>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  Patient reported subsided pain. Filled canals with Gutta-percha. Prescribed Ibuprofen 400mg.
                </p>
              </div>

              {/* Timeline Item 2 */}
              <div className="relative">
                <span className="absolute -left-[41px] top-1 h-5 w-5 rounded-full bg-slate-300 border-4 border-white"></span>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-slate-900">Initial Consultation</h3>
                  <span className="text-xs text-slate-400">01 Dec 2024</span>
                </div>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  Complained of sensitivity in upper right molar. X-Ray revealed deep decay. Scheduled RCT.
                </p>
                <div className="mt-2 flex gap-2">
                   {/* Mock X-Ray Thumbnail */}
                   <div className="h-16 w-16 bg-black rounded flex items-center justify-center text-xs text-slate-400">X-RAY</div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Right: Actions & Procedures */}
        <div className="space-y-6">
          <Card>
             <CardHeader>
               <CardTitle className="text-sm">Quick Procedures</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2">
               <Button variant="outline" className="w-full justify-start">
                 <Syringe className="mr-2 h-4 w-4 text-slate-400" /> Anesthesia (Lidocaine)
               </Button>
               <Button variant="outline" className="w-full justify-start">
                 <FileText className="mr-2 h-4 w-4 text-slate-400" /> Generate Prescription
               </Button>
               <Button variant="outline" className="w-full justify-start">
                 <Clock className="mr-2 h-4 w-4 text-slate-400" /> Book Follow-up
               </Button>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
