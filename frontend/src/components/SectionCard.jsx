export default function SectionCard({ title, children }) {
  return (
    <section style={{ marginBottom: 14 }}>
      <h4 style={{ marginBottom: 8 }}>{title}</h4>
      {children}
    </section>
  );
}
