export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center space-y-4">
        {/* Animated Brand Logo */}
        <div className="relative">
           <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-doctor animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-doctor">
             AI
           </div>
        </div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">
          Loading Clinical Data...
        </p>
      </div>
    </div>
  );
}
