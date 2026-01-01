import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { address: string };

export default function MapLinkButton({ address }: Props) {
  // Safe Google Maps URL encoding
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <Button 
      variant="outline" 
      size="sm" 
      asChild 
      className="text-blue-600 hover:text-blue-700 border-blue-100 hover:bg-blue-50"
    >
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        <span>View on Maps</span>
        <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
      </a>
    </Button>
  );
}