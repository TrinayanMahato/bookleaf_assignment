export default function Logo({ subtitle }) {
  return (
    <span className="logo">
      <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <path d="M9 22c0-7 5-12 14-13-1 9-6 14-13 14" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 22l7-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="logo-text">
        BookLeaf
        {subtitle && <span className="logo-sub">{subtitle}</span>}
      </span>
    </span>
  );
}
