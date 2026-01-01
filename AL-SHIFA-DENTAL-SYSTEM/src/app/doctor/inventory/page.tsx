"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, PackagePlus, Loader2, RefreshCcw } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function InventoryPage() {
  const router = useRouter();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) return router.push("/auth/doctor/login");

    try {
      const response = await api.get("/doctor/inventory", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventory(response.data);
    } catch (error) {
      console.error("Failed to load inventory", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Calculate Stats
  const criticalCount = inventory.filter(i => i.status === "Critical").length;
  const goodCount = inventory.filter(i => i.status === "Good").length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchInventory} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="doctor">
            <PackagePlus className="mr-2 h-4 w-4" /> Add Stock
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-100">
           <CardContent className="pt-6 flex items-center gap-4">
             <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
               <AlertTriangle className="h-6 w-6" />
             </div>
             <div>
               <p className="text-2xl font-bold text-red-700">{criticalCount} Items</p>
               <p className="text-xs text-red-600">Critical Stock Level</p>
             </div>
           </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
           <CardContent className="pt-6 flex items-center gap-4">
             <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <CheckCircle className="h-6 w-6" />
             </div>
             <div>
               <p className="text-2xl font-bold text-green-700">{goodCount} Items</p>
               <p className="text-xs text-green-600">Healthy Stock</p>
             </div>
           </CardContent>
        </Card>
      </div>

      {/* Real Data Table */}
      <Card>
        <CardHeader><CardTitle>Stock List (Live from Agent Memory)</CardTitle></CardHeader>
        <CardContent>
          {loading && inventory.length === 0 ? (
            <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-doctor"/></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Stock / Reorder</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-slate-500">{item.supplier}</td>
                    <td className="p-3">
                      <span className="font-bold">{item.stock}</span> <span className="text-slate-400">/ {item.reorder_level}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        item.status === 'Critical' ? 'bg-red-100 text-red-700' :
                        item.status === 'Low' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" className="text-doctor hover:text-doctor-dark hover:bg-blue-50">
                        Update
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