export function Card({ children, style }) {
  const baseStyle = {
    backgroundColor: "#1E2635", // abu tua elegan
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
    color: "#E0E6EF", // teks abu terang
    fontSize: "0.9rem",
    ...style,
  };

  return <div style={baseStyle}>{children}</div>;
}

export function CardContent({ children }) {
  return <div style={{ padding: "4px 0" }}>{children}</div>;
}
