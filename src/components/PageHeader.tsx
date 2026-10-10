import type { ReactNode } from "react";

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  aside,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <span className="page-sub">{subtitle}</span>}
      </div>
      {aside}
    </header>
  );
}
