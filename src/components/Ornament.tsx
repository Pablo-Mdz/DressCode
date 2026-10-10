// Filete dorado con rombo central, al estilo de los marcos barrocos.
export default function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`ornament ${className}`} aria-hidden>
      <span className="ornament-line" />
      <svg width="34" height="12" viewBox="0 0 34 12">
        <path d="M17 1 22 6 17 11 12 6Z" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="17" cy="6" r="1.4" fill="currentColor" />
        <circle cx="6" cy="6" r="1" fill="currentColor" />
        <circle cx="28" cy="6" r="1" fill="currentColor" />
      </svg>
      <span className="ornament-line" />
    </div>
  );
}
