import React from "react";

export default function Header({ onMenuClick }) {
  return (
    <header style={styles.header}>
      <button onClick={onMenuClick} style={styles.menuBtn}>☰</button>
      <span style={styles.brand}>Dental Intelligence System</span>
    </header>
  );
}

const styles = {
  header: {
    height: "56px",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 100
  },
  menuBtn: {
    fontSize: "20px",
    background: "none",
    border: "none",
    cursor: "pointer",
    marginRight: "16px"
  },
  brand: {
    fontSize: "17px",
    fontWeight: 600,
    color: "#111827"
  }
};
