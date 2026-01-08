"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Loader2 } from "lucide-react";
import { PatientAPI } from "@/lib/api";

export default function PatientInvoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await PatientAPI.getMyInvoices();
        setInvoices(res.data);
      } catch (error) {
        console.error("Error fetching invoices", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const downloadInvoice = async (id: number) => {
    try {
        const res = await PatientAPI.getInvoiceDetail(id);
        const inv = res.data;
        const win = window.open("", "Invoice", "width=800,height=600");
        if(win) {
            win.document.write(`
                <html>
                <head><title>Invoice #${inv.id}</title></head>
                <body style="font-family: sans-serif; padding: 40px; color: #333;">
                    <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px;">
                        <h1 style="margin:0">${inv.hospital.name}</h1>
                        <p style="margin:5px 0">${inv.hospital.address}</p>
                    </div>
                    <div style="margin-top: 40px;">
                        <p><strong>Patient:</strong> ${inv.patient.name} (ID: ${inv.patient.id})</p>
                        <p><strong>Date:</strong> ${inv.date}</p>
                        <p><strong>Status:</strong> ${inv.status}</p>
                    </div>
                    <table style="width: 100%; margin-top: 30px; border-collapse: collapse;">
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 12px; text-align: left;">Description</th>
                            <th style="padding: 12px; text-align: right;">Amount</th>
                        </tr>
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                                ${inv.treatment.name}
                            </td>
                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">
                                Rs. ${inv.amount}
                            </td>
                        </tr>
                    </table>
                    <h3 style="text-align: right; margin-top: 20px;">Total: Rs. ${inv.amount}</h3>
                    <script>window.print();</script>
                </body>
                </html>
            `);
            win.document.close();
        }
    } catch(e) { alert("Could not load invoice."); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Invoices</h1>
      
      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600"/></div>
      ) : invoices.length === 0 ? (
        <Card className="text-center p-10">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2"/>
            <p className="text-slate-500">No invoices found.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invoices.map((inv) => (
            <Card key={inv.id} className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-bold text-slate-800">{inv.treatment}</h3>
                <p className="text-sm text-slate-500">{inv.date} • Dr. {inv.doctor_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {inv.status.toUpperCase()}
                </span>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-lg">Rs. {inv.amount}</p>
                <Button size="sm" variant="ghost" onClick={() => downloadInvoice(inv.id)}>
                    <Download className="h-4 w-4 mr-2"/> Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}