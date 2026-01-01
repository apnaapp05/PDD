export default function PrimaryButton({ children, ...props }) {
  return (
    <button {...props} style={styles.btn}>
      {children}
    </button>
  );
}

const styles = {
  btn: {
    width: "100%",
    padding: "12px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600
  }
};
