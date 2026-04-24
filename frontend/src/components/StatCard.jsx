export default function StatCard({ title, value }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, minWidth: 150 }}>
      <b>{title}</b>
      <div>{value}</div>
    </div>
  );
}
