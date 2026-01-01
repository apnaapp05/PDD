import React, { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={styles.wrapper}>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "#f9fafb"
  },
  main: {
    padding: "24px"
  }
};
