type LogoProps = {
  className?: string;
  ariaLabel?: string;
};

export function LogoHorizontal({ className, ariaLabel = "OpoAlerta" }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 205"
      className={className}
      role="img"
      aria-label={ariaLabel}
      fill="none"
    >
      <path d="M35,65 H125 L142,82 V198 H35 Z" fill="#E4E6EA" stroke="#1B3358" strokeWidth="5" strokeLinejoin="round" />
      <polygon points="125,65 142,82 125,82" fill="#C9CDD3" stroke="#1B3358" strokeWidth="3" strokeLinejoin="round" />
      <path d="M15,45 H103 L120,62 V182 H15 Z" fill="#ffffff" stroke="#1B3358" strokeWidth="5" strokeLinejoin="round" />
      <polygon points="103,45 120,62 103,62" fill="#E4E6EA" stroke="#1B3358" strokeWidth="3" strokeLinejoin="round" />
      <line x1="32" y1="95" x2="90" y2="95" stroke="#B7BCC4" strokeWidth="7" strokeLinecap="round" />
      <line x1="32" y1="113" x2="90" y2="113" stroke="#B7BCC4" strokeWidth="7" strokeLinecap="round" />
      <line x1="32" y1="131" x2="75" y2="131" stroke="#B7BCC4" strokeWidth="7" strokeLinecap="round" />
      <path d="M118,58 L183,12 L183,88 L118,74 Z" fill="#D9A62B" stroke="#1B3358" strokeWidth="5" strokeLinejoin="round" />
      <ellipse cx="188" cy="50" rx="9" ry="42" fill="#C7941F" stroke="#1B3358" strokeWidth="5" />
      <circle cx="121" cy="61" r="10" fill="#1B3358" />
      <rect x="92" y="64" width="26" height="16" rx="4" fill="#D9A62B" stroke="#1B3358" strokeWidth="4" transform="rotate(38 92 64)" />
      <line x1="198" y1="18" x2="213" y2="4" stroke="#1B3358" strokeWidth="5" strokeLinecap="round" />
      <line x1="202" y1="50" x2="220" y2="50" stroke="#1B3358" strokeWidth="5" strokeLinecap="round" />
      <line x1="198" y1="82" x2="213" y2="96" stroke="#1B3358" strokeWidth="5" strokeLinecap="round" />
      <text
        x="255"
        y="130"
        fontFamily="var(--font-poppins), Poppins, Arial, sans-serif"
        fontWeight="800"
        fontSize="72"
        letterSpacing="-2"
        fill="#1B3358"
      >
        Opo<tspan fill="#D9A62B">Alerta</tspan>
      </text>
    </svg>
  );
}

export function LogoHorizontalDark({ className, ariaLabel = "OpoAlerta" }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 205"
      className={className}
      role="img"
      aria-label={ariaLabel}
      fill="none"
    >
      <path d="M35,65 H125 L142,82 V198 H35 Z" fill="#33507A" stroke="#ffffff" strokeWidth="5" strokeLinejoin="round" />
      <polygon points="125,65 142,82 125,82" fill="#4A6491" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />
      <path d="M15,45 H103 L120,62 V182 H15 Z" fill="#ffffff" stroke="#0F2340" strokeWidth="5" strokeLinejoin="round" />
      <polygon points="103,45 120,62 103,62" fill="#E4E6EA" stroke="#0F2340" strokeWidth="3" strokeLinejoin="round" />
      <line x1="32" y1="95" x2="90" y2="95" stroke="#C3CEE0" strokeWidth="7" strokeLinecap="round" />
      <line x1="32" y1="113" x2="90" y2="113" stroke="#C3CEE0" strokeWidth="7" strokeLinecap="round" />
      <line x1="32" y1="131" x2="75" y2="131" stroke="#C3CEE0" strokeWidth="7" strokeLinecap="round" />
      <path d="M118,58 L183,12 L183,88 L118,74 Z" fill="#D9A62B" stroke="#ffffff" strokeWidth="5" strokeLinejoin="round" />
      <ellipse cx="188" cy="50" rx="9" ry="42" fill="#C7941F" stroke="#ffffff" strokeWidth="5" />
      <circle cx="121" cy="61" r="10" fill="#0F2340" />
      <rect x="92" y="64" width="26" height="16" rx="4" fill="#D9A62B" stroke="#ffffff" strokeWidth="4" transform="rotate(38 92 64)" />
      <line x1="198" y1="18" x2="213" y2="4" stroke="#F7C948" strokeWidth="5" strokeLinecap="round" />
      <line x1="202" y1="50" x2="220" y2="50" stroke="#F7C948" strokeWidth="5" strokeLinecap="round" />
      <line x1="198" y1="82" x2="213" y2="96" stroke="#F7C948" strokeWidth="5" strokeLinecap="round" />
      <text
        x="255"
        y="130"
        fontFamily="var(--font-poppins), Poppins, Arial, sans-serif"
        fontWeight="800"
        fontSize="72"
        letterSpacing="-2"
        fill="#ffffff"
      >
        Opo<tspan fill="#F7C948">Alerta</tspan>
      </text>
    </svg>
  );
}

export function LogoIcon({ className, ariaLabel = "OpoAlerta" }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 235 205"
      className={className}
      role="img"
      aria-label={ariaLabel}
      fill="none"
    >
      <path d="M35,65 H125 L142,82 V198 H35 Z" fill="#E4E6EA" stroke="#1B3358" strokeWidth="5" strokeLinejoin="round" />
      <polygon points="125,65 142,82 125,82" fill="#C9CDD3" stroke="#1B3358" strokeWidth="3" strokeLinejoin="round" />
      <path d="M15,45 H103 L120,62 V182 H15 Z" fill="#ffffff" stroke="#1B3358" strokeWidth="5" strokeLinejoin="round" />
      <polygon points="103,45 120,62 103,62" fill="#E4E6EA" stroke="#1B3358" strokeWidth="3" strokeLinejoin="round" />
      <line x1="32" y1="95" x2="90" y2="95" stroke="#B7BCC4" strokeWidth="7" strokeLinecap="round" />
      <line x1="32" y1="113" x2="90" y2="113" stroke="#B7BCC4" strokeWidth="7" strokeLinecap="round" />
      <line x1="32" y1="131" x2="75" y2="131" stroke="#B7BCC4" strokeWidth="7" strokeLinecap="round" />
      <path d="M118,58 L183,12 L183,88 L118,74 Z" fill="#D9A62B" stroke="#1B3358" strokeWidth="5" strokeLinejoin="round" />
      <ellipse cx="188" cy="50" rx="9" ry="42" fill="#C7941F" stroke="#1B3358" strokeWidth="5" />
      <circle cx="121" cy="61" r="10" fill="#1B3358" />
      <rect x="92" y="64" width="26" height="16" rx="4" fill="#D9A62B" stroke="#1B3358" strokeWidth="4" transform="rotate(38 92 64)" />
      <line x1="198" y1="18" x2="213" y2="4" stroke="#1B3358" strokeWidth="5" strokeLinecap="round" />
      <line x1="202" y1="50" x2="220" y2="50" stroke="#1B3358" strokeWidth="5" strokeLinecap="round" />
      <line x1="198" y1="82" x2="213" y2="96" stroke="#1B3358" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
