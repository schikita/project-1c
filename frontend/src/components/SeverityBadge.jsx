const severityBadgeStyle = {
  critical: { background: "#ffe5e5", color: "#b20000" },
  high: { background: "#fff0e0", color: "#9a4d00" },
  medium: { background: "#fffbe6", color: "#8a6d00" },
  low: { background: "#e8f5ff", color: "#005a9c" },
  info: { background: "#edf2f7", color: "#364152" },
};

export default function SeverityBadge({ severity }) {
  const style = severityBadgeStyle[severity] || severityBadgeStyle.info;
  return (
    <span
      style={{
        ...style,
        borderRadius: 10,
        padding: "2px 8px",
        fontSize: 12,
      }}
    >
      {severity}
    </span>
  );
}
