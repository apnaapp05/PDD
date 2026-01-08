"use client";

import { useState, useEffect, useRef } from "react";
import { DoctorAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Upload, Search, RefreshCcw, Plus, Minus, X, Loader2 } from "lucide-react";

// Interface for type safety
interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  threshold: number;
}

export default function InventoryPage() {
  // --- State ---
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [newItem, setNewItem] = useState({ name: "", quantity: 0, unit: "pcs", threshold: 10 });
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Data Loading ---
  const load = async () => {
    // Only show full loader on initial load, not during refreshes to keep UI snappy
    if(items.length === 0) setLoading(true); 
    try {
      const res = await DoctorAPI.getInventory();
      setItems(res.data);
    } catch (e) { 
      console.error("Failed to load inventory", e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, []);

  // --- Handlers ---

  const handleUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fd = new FormData();
    fd.append("file", file);
    
    try {
      await DoctorAPI.uploadInventory(fd);
      alert("Inventory CSV Uploaded Successfully!");
      load();
    } catch (err) { 
      alert("Failed. CSV Headers must be: Item Name, Quantity, Unit"); 
    } finally { 
      if(fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  const handleAddItem = async () => {
    if(!newItem.name) return;
    try {
        await DoctorAPI.addInventoryItem(newItem);
        setShowModal(false);
        setNewItem({ name: "", quantity: 0, unit: "pcs", threshold: 10 });
        load();
    } catch (e) {
        alert("Failed to add item");
    }
  };

  const handleUpdateStock = async (item: InventoryItem, change: number) => {
    const newQty = Math.max(0, item.quantity + change);
    
    // 1. Optimistic UI Update (Update state immediately before API call)
    setItems(currentItems => 
        currentItems.map(i => i.id === item.id ? {...i, quantity: newQty} : i)
    );

    try {
        // 2. API Call
        await DoctorAPI.updateStock(item.id, newQty);
    } catch (e) {
        // 3. Revert on failure
        console.error("Stock update failed", e);
        alert("Failed to update stock");
        load(); // Re-fetch true data
    }
  };

  // --- Filtering ---
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  // --- Render ---
  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600"/> Inventory Management
        </h1>
        <div className="flex gap-2">
          {/* Hidden File Input */}
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleUpload} />
          
          <Button onClick={() => setShowModal(true)} className="bg-indigo-600">
            <Plus className="h-4 w-4 mr-2"/> Add Item
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2"/> CSV Import
          </Button>
          <Button onClick={load} variant="ghost" size="icon">
            <RefreshCcw className="h-4 w-4"/>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-2">
            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                    placeholder="Search items..." 
                    value={search} 
                    onChange={e=>setSearch(e.target.value)} 
                    className="pl-9"
                />
            </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-slate-400"/></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 uppercase text-xs text-slate-500">
                  <tr>
                    <th className="p-3 rounded-tl-lg">Name</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Actions</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3 rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length > 0 ? filtered.map(i => (
                    <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium text-slate-700">{i.name}</td>
                      <td className="p-3 font-mono font-bold text-lg text-slate-800">{i.quantity}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 hover:border-red-300 hover:bg-red-50 hover:text-red-600" onClick={() => handleUpdateStock(i, -1)}>
                                <Minus className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" onClick={() => handleUpdateStock(i, 1)}>
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                      </td>
                      <td className="p-3 text-slate-500">{i.unit}</td>
                      <td className="p-3">
                        {i.quantity < i.threshold ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Low Stock
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                OK
                            </span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">No items found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm bg-white shadow-xl">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Add New Stock</CardTitle>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500"><X className="h-5 w-5"/></button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                  <label className="text-sm font-medium">Item Name</label>
                  <Input placeholder="e.g. Latex Gloves" value={newItem.name} onChange={e=>setNewItem({...newItem, name: e.target.value})}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Initial Qty</label>
                    <Input type="number" placeholder="0" value={newItem.quantity} onChange={e=>setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}/>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Unit</label>
                    <Input placeholder="e.g. Box" value={newItem.unit} onChange={e=>setNewItem({...newItem, unit: e.target.value})}/>
                </div>
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-medium">Low Stock Threshold</label>
                  <Input type="number" placeholder="10" value={newItem.threshold} onChange={e=>setNewItem({...newItem, threshold: parseInt(e.target.value) || 0})}/>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleAddItem} className="bg-indigo-600">Save Item</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}