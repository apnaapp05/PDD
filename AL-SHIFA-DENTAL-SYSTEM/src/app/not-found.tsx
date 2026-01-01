import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Frown } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 text-center px-4">
      <div className="bg-white p-8 rounded-full shadow-lg mb-6">
        <Frown className="h-20 w-20 text-slate-400" />
      </div>
      <h1 className="text-4xl font-bold text-slate-900">404</h1>
      <h2 className="text-xl font-semibold text-slate-700 mt-2">Page Not Found</h2>
      <p className="text-slate-500 mt-2 max-w-md">
        Oops! It seems this tooth... err, page is missing. It might have been extracted or never existed.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
        <Link href="/auth/role-selection">
          <Button variant="doctor">Login Portal</Button>
        </Link>
      </div>
    </div>
  );
}
