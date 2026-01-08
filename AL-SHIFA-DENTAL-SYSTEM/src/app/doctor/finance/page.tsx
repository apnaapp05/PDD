"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Printer, RefreshCcw, Loader2, FileText, TrendingUp } from "lucide-react";
import { DoctorAPI, api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function FinancePage() {
  const router = useRouter();
  const [data, setData] = useState<any>({ total_revenue: 0, total_pending: 0, invoices: [] });
  const [graphData, setGraphData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFinance = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) return router.push("/auth/doctor/login");

    try {
      const response = await DoctorAPI.getFinance();
      setData(response.data);
      processGraphData(response.data.invoices);
    } catch (error) {
      console.error("Failed to load finance data", error);
    } finally {
      setLoading(false);
    }
  };

  const processGraphData = (invoices: any[]) => {
    const grouped: any = {};
    invoices.forEach(inv => {
      const date = inv.date;
      if (!grouped[date]) grouped[date] = 0;
      grouped[date] += inv.amount;
    });

    const chartData = Object.keys(grouped).map(date => ({
      date: date,
      revenue: grouped[date]
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setGraphData(chartData);
  };

  // Print Functionality
  const printInvoice = async (id: number) => {
    try {
        const res = await api.get(`/doctor/invoices/${id}`);
        const inv = res.data;
        const win = window.open("", "Invoice", "width=800,height=600");
        if(win) {
            win.document.write(`
                <html>
                <head><title>Invoice #${inv.id}</title></head>
                <body style="font-family: sans-serif; padding: 40px; color: #333;">
                    <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px;">
                        <h1 style="margin:0">${inv.hospital.name}</h1>
                        <p style="margin:5px 0">${inv.hospital.address} | ${inv.hospital.phone}</p>
                    </div>
                    <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                        <div>
                            <strong>Bill To:</strong><br/>
                            ${inv.patient.name}<br/>
                            ID: #${inv.patient.id} | ${inv.patient.age}Y/${inv.patient.gender}
                        </div>
                        <div style="text-align: right;">
                            <strong>Invoice #${inv.id}</strong><br/>
                            Date: ${inv.date}<br/>
                            Status: ${inv.status}
                        </div>
                    </div>
                    <table style="width: 100%; margin-top: 30px; border-collapse: collapse;">
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 12px; text-align: left;">Treatment / Item</th>
                            <th style="padding: 12px; text-align: right;">Cost</th>
                        </tr>
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                                <strong>${inv.treatment.name}</strong><br/>
                                <small style="color: #64748b">${inv.treatment.notes || ''}</small>
                            </td>
                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">
                                Rs. ${inv.amount.toLocaleString()}
                            </td>
                        </tr>
                    </table>
                    <div style="margin-top: 30px; text-align: right;">
                        <h3 style="margin:0">Total: Rs. ${inv.amount.toLocaleString()}</h3>
                    </div>
                    <div style="margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
                        Generated electronically by Al-Shifa Dental System
                    </div>
                    <script>window.print();</script>
                </body>
                </html>
            `);
            win.document.close();
        }
    } catch(e) { alert("Could not generate invoice. Make sure the appointment is completed."); }
  };

  useEffect(() => { fetchFinance(); }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Financial Overview</h1>
        <Button variant="outline" onClick={fetchFinance} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-900 text-white shadow-xl border-none">
          <CardContent className="pt-6">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Revenue (Paid)</p>
                 <h2 className="text-4xl font-bold mt-2">Rs. {data.total_revenue.toLocaleString()}</h2>
               </div>
               <div className="bg-green-500/20 p-3 rounded-xl border border-green-500/50">
                 <DollarSign className="h-8 w-8 text-green-400" />
               </div>
             </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-yellow-500 shadow-sm">
          <CardContent className="pt-6">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Pending Payments</p>
                 <h2 className="text-4xl font-bold mt-2 text-slate-900">Rs. {data.total_pending.toLocaleString()}</h2>
               </div>
               <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                 <FileText className="h-8 w-8 text-yellow-600" />
               </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" /> Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">Loading Chart...</div>
          ) : graphData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graphData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: number) => [`Rs. ${value}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 border-2 border-dashed rounded-lg">No revenue data to display yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
           {loading && data.invoices.length === 0 ? (
             <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600"/></div>
           ) : (
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                 <tr>
                   <th className="p-3">Invoice ID</th>
                   <th className="p-3">Patient</th>
                   <th className="p-3">Procedure</th>
                   <th className="p-3">Amount</th>
                   <th className="p-3">Status</th>
                   <th className="p-3">Date</th>
                   <th className="p-3">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {data.invoices.map((inv: any) => (
                   <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                     <td className="p-3 font-mono font-medium text-slate-600">INV-{inv.id}</td>
                     <td className="p-3 font-bold text-slate-900">{inv.patient_name}</td>
                     <td className="p-3 text-slate-500">{inv.procedure}</td>
                     <td className="p-3 font-mono">Rs. {inv.amount.toLocaleString()}</td>
                     <td className="p-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                          inv.status === 'Paid' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        }`}>{inv.status}</span>
                     </td>
                     <td className="p-3 text-slate-400 text-xs">{inv.date}</td>
                     <td className="p-3">
                       <Button variant="ghost" size="sm" onClick={() => printInvoice(inv.id)}>
                         <Printer className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                       </Button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
        </CardContent>
      </Card>
    </div>
  );
}