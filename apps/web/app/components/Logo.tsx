import { useId } from "react";

type LogoProps = {
  className?: string;
  ariaLabel?: string;
};

// Logo: documento con campana (docs/logo/originales/ guarda los PNG de partida).
// Dos paletas, una por tipo de fondo, con el contraste medido (WCAG):
// - Oscura, sobre navy #1B3358: blanco 12.6:1, amarillo #F7C948 8.1:1.
// - Clara, sobre crema #F7F5F0: navy 11.6:1, «Alerta» en oro oscuro #8A6100
//   5.1:1. El amarillo de marca sobre crema da 1.5:1, así que en claro la
//   campana lo conserva pero con contorno navy, y los rayos van en navy.
// Los huecos (rayas del documento y el halo de la campana) son máscara, no
// pintura del color de fondo: así el logo vale sobre cualquier fondo.
type Paleta = {
  documento: string;
  campana: string;
  contornoCampana?: string;
  rayos: string;
  opo: string;
  alerta: string;
};

const OSCURA: Paleta = {
  documento: "#ffffff",
  campana: "#F7C948",
  rayos: "#F7C948",
  opo: "#ffffff",
  alerta: "#F7C948",
};

const CLARA: Paleta = {
  documento: "#1B3358",
  campana: "#F7C948",
  contornoCampana: "#1B3358",
  rayos: "#1B3358",
  opo: "#1B3358",
  alerta: "#8A6100",
};

const CAMPANA =
  "M162,40 C138,40 128,58 128,80 V100 L116,114 H208 L196,100 V80 C196,58 186,40 162,40 Z";
const BADAJO = "M150,119 A12,12 0 0 0 174,119 Z";
const DOCUMENTO =
  "M30,50 H96 L128,82 V174 A12,12 0 0 1 116,186 H30 A12,12 0 0 1 18,174 V62 A12,12 0 0 1 30,50 Z";

function Icono({ paleta, mascara }: { paleta: Paleta; mascara: string }) {
  const contorno = paleta.contornoCampana;
  return (
    <>
      <mask id={mascara} maskUnits="userSpaceOnUse" x="0" y="0" width="250" height="200">
        <rect width="250" height="200" fill="#fff" />
        <path d="M96,50 V76 A6,6 0 0 0 102,82 H128" stroke="#000" strokeWidth="8" fill="none" />
        <rect x="36" y="108" width="66" height="14" rx="7" fill="#000" />
        <rect x="36" y="136" width="66" height="14" rx="7" fill="#000" />
        <g fill="#000" stroke="#000" strokeWidth="14" strokeLinejoin="round">
          <circle cx="162" cy="34" r="8" />
          <path d={CAMPANA} />
          <path d={BADAJO} />
        </g>
      </mask>
      <path d={DOCUMENTO} fill={paleta.documento} mask={`url(#${mascara})`} />
      <g
        fill={paleta.campana}
        stroke={contorno}
        strokeWidth={contorno ? 6 : undefined}
        strokeLinejoin="round"
      >
        <circle cx="162" cy="34" r="8" />
        <path d={CAMPANA} />
        <path d={BADAJO} />
      </g>
      <g stroke={paleta.rayos} strokeWidth="9" strokeLinecap="round">
        <line x1="192" y1="26" x2="203" y2="9" />
        <line x1="205" y1="47" x2="224" y2="41" />
      </g>
    </>
  );
}

function Horizontal({ paleta, className, ariaLabel = "OpoAlerta" }: LogoProps & { paleta: Paleta }) {
  const mascara = `logo${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 762 200"
      className={className}
      role="img"
      aria-label={ariaLabel}
      fill="none"
    >
      <Icono paleta={paleta} mascara={mascara} />
      <text
        x="248"
        y="136"
        fontFamily="var(--font-poppins), Poppins, Arial, sans-serif"
        fontWeight="800"
        fontSize="96"
        letterSpacing="-2"
        fill={paleta.opo}
      >
        Opo<tspan fill={paleta.alerta}>Alerta</tspan>
      </text>
    </svg>
  );
}

export function LogoHorizontal(props: LogoProps) {
  return <Horizontal paleta={CLARA} {...props} />;
}

export function LogoHorizontalDark(props: LogoProps) {
  return <Horizontal paleta={OSCURA} {...props} />;
}

export function LogoIcon({ className, ariaLabel = "OpoAlerta" }: LogoProps) {
  const mascara = `logo${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="8 0 228 196"
      className={className}
      role="img"
      aria-label={ariaLabel}
      fill="none"
    >
      <Icono paleta={CLARA} mascara={mascara} />
    </svg>
  );
}
