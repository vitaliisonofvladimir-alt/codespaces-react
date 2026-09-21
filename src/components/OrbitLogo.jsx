export default function OrbitLogo({ className = 'brand-mark' }) {
  return (
    <svg className={className} viewBox="0 0 44 40" aria-hidden="true">
      <defs>
        <linearGradient id="orbit-gradient" x1="4" y1="34" x2="40" y2="6">
          <stop stopColor="#0b57d0" />
          <stop offset="1" stopColor="#8ab4f8" />
        </linearGradient>
      </defs>
      <ellipse
        cx="22"
        cy="20"
        rx="17"
        ry="8.5"
        fill="none"
        stroke="url(#orbit-gradient)"
        strokeWidth="2.4"
        transform="rotate(-24 22 20)"
      />
      <ellipse
        cx="22"
        cy="20"
        rx="17"
        ry="8.5"
        fill="none"
        stroke="#b6d2fb"
        strokeWidth="2.4"
        transform="rotate(35 22 20)"
      />
      <circle cx="22" cy="20" r="5.2" fill="#0b57d0" />
      <circle cx="36.5" cy="11.5" r="2.8" fill="#75a7f5" />
    </svg>
  );
}
