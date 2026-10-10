export default function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`wordmark wordmark-${size}`}>
      Dress<em>Code</em>
    </span>
  );
}
