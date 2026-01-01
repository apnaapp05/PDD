export default function AuthLinks({ mode, setMode, showForgot = true }) {
  return (
    <div style={styles.box}>
      <button
        type="button"
        style={styles.link}
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "Create an account" : "Back to login"}
      </button>
      {showForgot && (
        <button type="button" style={styles.link}>
          Forgot password?
        </button>
      )}
    </div>
  );
}

const styles = {
  box: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "space-between"
  },
  link: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontSize: "13px",
    cursor: "pointer"
  }
};
