import { Button } from "@/components/ui/button";
import KycStatusBadge from "./KycStatusBadge";
import { Eye, CheckCircle, XCircle } from "lucide-react";

interface KycTableProps {
  data: any[];
  columns: { header: string; key: string }[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onView: (id: string) => void;
}

export default function KycTable({ data, columns, onApprove, onReject, onView }: KycTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="p-4">{col.header}</th>
            ))}
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
              {columns.map((col, idx) => (
                <td key={idx} className="p-4 font-medium text-slate-700">
                  {item[col.key]}
                </td>
              ))}
              <td className="p-4">
                <KycStatusBadge status={item.status} />
              </td>
              <td className="p-4 flex justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => onView(item.id)} title="View Documents">
                  <Eye className="h-4 w-4 text-slate-500" />
                </Button>
                <Button variant="outline" size="icon" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => onApprove(item.id)}>
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => onReject(item.id)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="p-8 text-center text-slate-500">No records found.</div>
      )}
    </div>
  );
}