export default function InputField({ label, ...props }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ fontSize: "14px" }}>{label}</label>
      <input {...props} style={styles.input} />
    </div>
  );
}

const styles = {
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #e5e7eb"
  }
};
