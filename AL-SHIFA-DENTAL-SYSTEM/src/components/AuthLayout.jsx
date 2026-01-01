import React from "react";

export default function AuthLayout({ title, children }) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f9fafb"
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    padding: "24px",
    background: "#ffffff",
    borderRadius: "10px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
  },
  title: {
    marginBottom: "20px",
    fontSize: "20px",
    fontWeight: 600
  }
};
