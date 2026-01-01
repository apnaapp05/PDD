"use client";

import React from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  address: string;
  pincode: string;
}

export default function LocationSummary({ address, pincode }: Props) {
  // CORRECTED: Standard Google Maps Search URL
  const mapQuery = encodeURIComponent(`${address}, ${pincode}`);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
      <div className="space-y-1">
        <div className="flex items-start gap-2 text-slate-700">
          <MapPin className="h-4 w-4 mt-1 text-slate-400 shrink-0" />
          <span className="font-medium text-sm">{address}</span>
        </div>
        <p className="text-xs text-slate-500 pl-6">Pincode: {pincode}</p>
      </div>
      
      {/* FIX: Removed 'asChild'. We simply wrap the Button in the Link. 
          This avoids the React.Children.only error entirely. */}
      <a 
        href={googleMapsUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="shrink-0"
      >
        <Button variant="outline" size="sm" className="w-full sm:w-auto cursor-pointer">
          <ExternalLink className="mr-2 h-3 w-3" />
          View on Map
        </Button>
      </a>
    </div>
  );
}