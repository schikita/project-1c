export default function PageError({ message }) {
  if (!message) return null;
  return <p style={{ color: "crimson" }}>{message}</p>;
}
