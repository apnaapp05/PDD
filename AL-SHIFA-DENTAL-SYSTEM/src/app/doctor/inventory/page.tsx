"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Package, AlertTriangle, MinusCircle, PlusCircle, Upload, FileSpreadsheet } from "lucide-react";
import { DoctorAPI } from "@/lib/api";
import SmartAssistant from "@/components/chat/SmartAssistant";

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ name: "", quantity: "", unit: "pcs", threshold: "10" });
  const [showAdd, setShowAdd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInventory = async () => {
    try {
      const res = await DoctorAPI.getInventory();
      setItems(res.data);
    } catch (error) {
      console.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.quantity) return alert("Please fill details");
    try {
      await DoctorAPI.addInventoryItem({
        name: newItem.name,
        quantity: parseInt(newItem.quantity),
        unit: newItem.unit,
        threshold: parseInt(newItem.threshold)
      });
      setNewItem({ name: "", quantity: "", unit: "pcs", threshold: "10" });
      setShowAdd(false);
      fetchInventory();
    } catch (error) {
      alert("Failed to add item");
    }
  };

  const handleStockUpdate = async (id: number, change: number) => {
    try {
      await DoctorAPI.updateStock(id, change);
      fetchInventory(); // Refresh to show new quantity
    } catch (error) {
      alert("Update failed");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      await DoctorAPI.uploadInventory(formData);
      alert("Inventory Uploaded Successfully!");
      fetchInventory();
    } catch (error) {
      alert("Failed to upload file. Please ensure it is a valid CSV.");
    } finally {
      setLoading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- PREPARE CONTEXT FOR AI ---
  const inventoryContext = {
    total_items: items.length,
    low_stock_items: items.filter(i => i.quantity <= i.threshold).map(i => `${i.name} (Qty: ${i.quantity}, Threshold: ${i.threshold})`),
    items_summary: items.slice(0, 10).map(i => `${i.name}: ${i.quantity} ${i.unit}`)
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory & Supplies</h1>
          <p className="text-sm text-slate-500">Track consumption and low stock alerts</p>
        </div>
        
        <div className="flex gap-2">
          {/* Upload Button */}
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
            <Upload className="h-4 w-4 mr-2" /> Upload Sheet
          </Button>

          <Button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {/* Manual Add Form */}
      {showAdd && (
        <Card className="bg-slate-50 border-slate-200 animate-in slide-in-from-top-2">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-slate-500">Item Name</label>
              <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Lidocaine" />
            </div>
            <div className="w-full md:w-24">
              <label className="text-xs font-bold text-slate-500">Qty</label>
              <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
            </div>
            <div className="w-full md:w-24">
              <label className="text-xs font-bold text-slate-500">Unit</label>
              <Input value={newItem.unit} onChange={(e) => setNewItem({...newItem, unit: e.target.value})} />
            </div>
            <Button onClick={handleAddItem} className="w-full md:w-auto">Save</Button>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alerts */}
      {items.some(i => i.quantity <= i.threshold) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm flex items-center gap-3 animate-pulse">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Low Stock Alert</h3>
            <p className="text-xs text-red-600">
              {items.filter(i => i.quantity <= i.threshold).map(i => i.name).join(", ")} are running low.
            </p>
          </div>
        </div>
      )}

      {/* Inventory List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold text-slate-800">{item.name}</CardTitle>
              <Package className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className={`text-2xl font-bold ${item.quantity <= item.threshold ? 'text-red-600' : 'text-slate-900'}`}>
                    {item.quantity}
                  </div>
                  <p className="text-xs text-slate-500">{item.unit} available</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleStockUpdate(item.id, -1)}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    title="Use 1"
                  >
                    <MinusCircle className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => handleStockUpdate(item.id, 1)}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                    title="Restock 1"
                  >
                    <PlusCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 🟣 SMART ASSISTANT WITH INVENTORY CONTEXT */}
      <SmartAssistant 
        role="doctor" 
        pageName="Inventory" 
        pageContext={inventoryContext} 
      />
    </div>
  );
}