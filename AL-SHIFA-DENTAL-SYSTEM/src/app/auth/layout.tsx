"use client";

import React, { useState } from "react";
import Header from "@/components/Header"; 
import Sidebar from "@/components/Sidebar";

export default function AuthLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Global Header (Contains the ☰ Button) */}
      <Header onMenuClick={() => setSidebarOpen(true)} />

      {/* 2. Slide-out Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 3. Page Content (Login, Signup, Role Selection) */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}