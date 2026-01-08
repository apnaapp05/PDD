"use client";

import { useState, useEffect, useRef } from "react";
import { DoctorAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, Loader2, Link as LinkIcon, X, Save } from "lucide-react";
import { Input } from "@/components/ui/input";

// Interface definitions for better type safety (optional but recommended)
interface InventoryItem {
  id: number;
  name: string;
  unit: string;
}

interface RecipeItem {
  item_name: string;
  qty_required: number;
  unit: string;
}

interface Treatment {
  id: number;
  name: string;
  cost: number;
  description: string;
  recipe?: RecipeItem[];
}

export default function TreatmentsPage() {
  // --- State Management ---
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Creation State
  const [newT, setNewT] = useState({ name: "", cost: "", description: "" });
  
  // Recipe/Linking Modal State
  const [selectedT, setSelectedT] = useState<Treatment | null>(null);
  const [linkData, setLinkData] = useState({ item_id: "", quantity: "1" });

  // Refs
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Data Loading ---
  const load = async () => {
    try { 
      const [resT, resI] = await Promise.all([
        DoctorAPI.getTreatments(), 
        DoctorAPI.getInventory()
      ]);
      setTreatments(resT.data); 
      setInventory(resI.data);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, []);

  // --- Handlers ---

  const handleCreate = async () => {
    if(!newT.name || !newT.cost) return;
    try {
      await DoctorAPI.createTreatment({ ...newT, cost: parseFloat(newT.cost) });
      setNewT({ name: "", cost: "", description: "" });
      load(); // Reload to show new treatment
    } catch (e) {
      alert("Failed to create treatment.");
    }
  };

  const handleUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fd = new FormData();
    fd.append("file", file);
    
    try {
      await DoctorAPI.uploadTreatments(fd);
      alert("Treatments Uploaded Successfully!");
      load();
    } catch { 
      alert("Failed. Headers needed: Treatment Name, Cost, Description"); 
    } finally { 
      if (fileRef.current) fileRef.current.value = ""; 
    }
  };

  const handleLink = async () => {
    if (!selectedT || !linkData.item_id) return;
    try {
        await DoctorAPI.linkInventory(selectedT.id, { 
            item_id: parseInt(linkData.item_id), 
            quantity: parseInt(linkData.quantity) 
        });
        
        alert("Added to recipe!");
        setLinkData({ item_id: "", quantity: "1" });
        load(); // Reload to see updated recipe in the UI
        setSelectedT(null); // Optional: Close modal after save, or keep open to add more
    } catch(e) { 
        alert("Failed to link item"); 
    }
  };

  // --- Render ---

  if(loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline"/> Loading...</div>;

  return (
    <div className="space-y-6 relative">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Treatment Recipes</h1>
        <div className="flex gap-2">
            <input type="file" ref={fileRef} className="hidden" accept=".csv" onChange={handleUpload} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4"/> Import CSV
            </Button>
        </div>
      </div>

      {/* Create New Treatment Card */}
      <Card className="border-t-4 border-indigo-600">
        <CardHeader><CardTitle>Add New Treatment</CardTitle></CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
             <Input placeholder="Name (e.g. Root Canal)" value={newT.name} onChange={e=>setNewT({...newT, name: e.target.value})} />
          </div>
          <div className="w-full md:w-1/3">
             <Input placeholder="Description" value={newT.description} onChange={e=>setNewT({...newT, description: e.target.value})} />
          </div>
          <Input placeholder="Cost" type="number" className="w-32" value={newT.cost} onChange={e=>setNewT({...newT, cost: e.target.value})} />
          <Button onClick={handleCreate} className="bg-indigo-600 shrink-0"><Plus className="mr-2 h-4 w-4"/> Add</Button>
        </CardContent>
      </Card>

      {/* Treatments List Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {treatments.map(t => (
          <Card key={t.id} className="relative group hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">{t.name}</h3>
                    <span className="text-green-600 font-bold whitespace-nowrap">Rs. {t.cost}</span>
                </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 mb-3">{t.description}</p>
              
              {/* RECIPE DISPLAY */}
              <div className="bg-slate-50 p-2 rounded-lg text-xs space-y-1 mb-3 min-h-[60px]">
                <p className="font-bold text-slate-400 uppercase tracking-wide">Resources Used:</p>
                {t.recipe && t.recipe.length > 0 ? (
                    t.recipe.map((r, idx) => (
                        <div key={idx} className="flex justify-between border-b border-slate-100 last:border-0 pb-1">
                            <span>{r.item_name}</span>
                            <span className="font-mono">{r.qty_required} {r.unit}</span>
                        </div>
                    ))
                ) : ( <p className="text-slate-400 italic">No items linked</p> )}
              </div>

              <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedT(t)}>
                <LinkIcon className="h-3 w-3 mr-2"/> Edit Recipe
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* RECIPE EDIT MODAL */}
      {selectedT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-white shadow-xl">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Edit Recipe: {selectedT.name}</CardTitle>
                    <button onClick={() => setSelectedT(null)} className="text-slate-400 hover:text-red-500">
                        <X className="h-5 w-5"/>
                    </button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Inventory Item</label>
                        <select 
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                            onChange={e => setLinkData({...linkData, item_id: e.target.value})}
                            value={linkData.item_id}
                        >
                            <option value="">-- Choose Item --</option>
                            {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Quantity Required per Treatment</label>
                        <Input type="number" value={linkData.quantity} onChange={e => setLinkData({...linkData, quantity: e.target.value})} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" onClick={() => setSelectedT(null)}>Close</Button>
                        <Button onClick={handleLink} disabled={!linkData.item_id} className="bg-indigo-600">
                            <Save className="h-4 w-4 mr-2" /> Add Item
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}