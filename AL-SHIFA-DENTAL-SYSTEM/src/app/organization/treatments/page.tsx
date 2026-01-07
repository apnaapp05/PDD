"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Link as LinkIcon, AlertCircle, Loader2, Pill } from "lucide-react";
import { OrganizationAPI } from "@/lib/api";

const SimpleSelect = ({ value, onChange, options, placeholder }: any) => (
  <select 
    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
    value={value}
    onChange={onChange}
  >
    <option value="" disabled>{placeholder}</option>
    {options.map((opt: any) => (
      <option key={opt.id} value={opt.id}>{opt.name}</option>
    ))}
  </select>
);

export default function TreatmentManager() {
  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  
  // Create Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newTreatment, setNewTreatment] = useState({ name: "", cost: "", description: "" });

  // Linking State
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const [linkData, setLinkData] = useState({ item_id: "", quantity: "1" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, iRes] = await Promise.all([
        OrganizationAPI.getTreatments(),
        OrganizationAPI.getInventory()
      ]);
      setTreatments(tRes.data);
      setInventory(iRes.data);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!newTreatment.name || !newTreatment.cost) return alert("Name and Cost are required");
    try {
      await OrganizationAPI.createTreatment({
        name: newTreatment.name,
        cost: parseFloat(newTreatment.cost),
        description: newTreatment.description
      });
      setNewTreatment({ name: "", cost: "", description: "" });
      setIsCreating(false);
      fetchData();
    } catch (err) {
      alert("Failed to create treatment");
    }
  };

  const handleLinkInventory = async (treatmentId: number) => {
    if (!linkData.item_id || !linkData.quantity) return;
    try {
      await OrganizationAPI.linkInventory(treatmentId, {
        item_id: parseInt(linkData.item_id),
        quantity: parseInt(linkData.quantity)
      });
      alert("Inventory Linked Successfully!");
      setLinkData({ item_id: "", quantity: "1" });
      setLinkingId(null);
      fetchData(); // Refresh list to see the new link
    } catch (err) {
      alert("Failed to link inventory");
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Treatment Catalog</h1>
          <p className="text-slate-500">Define services, prices, and inventory recipes.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus className="mr-2 h-4 w-4" /> New Treatment
        </Button>
      </div>

      {isCreating && (
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader>
            <CardTitle>Create New Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input 
                placeholder="Treatment Name (e.g. Root Canal)" 
                value={newTreatment.name}
                onChange={(e) => setNewTreatment({...newTreatment, name: e.target.value})}
              />
              <Input 
                type="number"
                placeholder="Cost (e.g. 1500)" 
                value={newTreatment.cost}
                onChange={(e) => setNewTreatment({...newTreatment, cost: e.target.value})}
              />
            </div>
            <Input 
              placeholder="Description (Optional)" 
              value={newTreatment.description}
              onChange={(e) => setNewTreatment({...newTreatment, description: e.target.value})}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Save Service</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {treatments.map((t) => (
          <Card key={t.id} className="relative group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{t.name}</CardTitle>
                <span className="text-lg font-bold text-green-600">${t.cost}</span>
              </div>
              <CardDescription>{t.description || "No description provided."}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mt-4 space-y-2 border-t pt-4 border-slate-100">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Pill className="h-3 w-3" /> Inventory Recipe
                </h4>
                
                {t.required_items && t.required_items.length > 0 ? (
                  <ul className="text-sm space-y-1 bg-slate-50 p-2 rounded border border-slate-100 mb-3">
                    {t.required_items.map((link: any, idx: number) => (
                      <li key={idx} className="flex justify-between text-slate-700">
                        <span>{link.item.name}</span>
                        <span className="font-semibold text-slate-900">
                          {link.quantity_required} <span className="text-xs font-normal text-slate-500">{link.item.unit}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic mb-3">No items linked yet.</p>
                )}
                
                {linkingId === t.id ? (
                  <div className="bg-blue-50 p-2 rounded-md border border-blue-100 space-y-2 animate-in fade-in">
                    <SimpleSelect 
                      placeholder="Select Item..."
                      value={linkData.item_id}
                      onChange={(e: any) => setLinkData({...linkData, item_id: e.target.value})}
                      options={inventory}
                    />
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Qty" 
                        className="w-20 h-8 bg-white"
                        value={linkData.quantity}
                        onChange={(e) => setLinkData({...linkData, quantity: e.target.value})} 
                      />
                      <Button size="sm" className="h-8" onClick={() => handleLinkInventory(t.id)}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setLinkingId(null)}>X</Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs h-8 border-dashed text-slate-500 hover:text-blue-600 hover:border-blue-600"
                    onClick={() => setLinkingId(t.id)}
                  >
                    <LinkIcon className="mr-1 h-3 w-3" /> Add Item
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {treatments.length === 0 && !isCreating && (
           <div className="col-span-full text-center py-20 text-slate-400 border-2 border-dashed rounded-xl">
             <AlertCircle className="mx-auto h-10 w-10 mb-2 opacity-50" />
             <p>No treatments defined yet.</p>
           </div>
        )}
      </div>
    </div>
  );
}