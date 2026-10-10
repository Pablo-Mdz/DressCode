export default function Wordmark({ size = 52 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      Dress<em>Code</em>
    </span>
  );
}
