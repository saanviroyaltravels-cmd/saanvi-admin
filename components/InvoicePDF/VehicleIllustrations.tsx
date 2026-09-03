/**
 * VehicleIllustrations.tsx
 * Professional SVG vehicle silhouettes — mapped by vehicle name.
 * Used when no image URL is available from the database.
 * ZERO impact on existing code.
 */

export type VehicleName =
  | 'Swift Dzire'
  | 'Toyota Etios'
  | 'Maruti Ertiga'
  | 'Toyota Innova'
  | 'Toyota Rumion'
  | 'KIA Carens'
  | 'Tempo Traveller'
  | string

interface VehicleIllustrationProps {
  vehicleName: VehicleName
  width?: number
  height?: number
  className?: string
}

/** Compact sedan — Swift Dzire / Toyota Etios */
function SedanSVG({ width = 220, height = 90 }: { width?: number; height?: number }) {
  return (
    <svg viewBox="0 0 220 90" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f4fd" />
          <stop offset="100%" stopColor="#b8d4f0" />
        </linearGradient>
        <linearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d0eaff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#9dc8f0" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* Body */}
      <rect x="18" y="42" width="184" height="32" rx="6" fill="url(#bodyGrad)" stroke="#1e3a8a" strokeWidth="1.5" />
      {/* Cabin */}
      <path d="M58 42 Q68 16 90 14 L140 14 Q162 16 168 42 Z" fill="url(#bodyGrad)" stroke="#1e3a8a" strokeWidth="1.5" />
      {/* Windshield */}
      <path d="M72 41 Q78 20 94 18 L136 18 Q150 20 154 41 Z" fill="url(#glassGrad)" stroke="#1e3a8a" strokeWidth="1" />
      {/* Windows */}
      <rect x="76" y="19" width="28" height="20" rx="2" fill="url(#glassGrad)" stroke="#1e3a8a" strokeWidth="0.8" />
      <rect x="110" y="19" width="28" height="20" rx="2" fill="url(#glassGrad)" stroke="#1e3a8a" strokeWidth="0.8" />
      {/* Door lines */}
      <line x1="105" y1="42" x2="108" y2="74" stroke="#1e3a8a" strokeWidth="0.8" opacity="0.5" />
      {/* Front wheel arch */}
      <ellipse cx="55" cy="75" rx="18" ry="18" fill="#1e3a8a" />
      <ellipse cx="55" cy="75" rx="11" ry="11" fill="#e2e8f0" />
      <ellipse cx="55" cy="75" rx="5" ry="5" fill="#94a3b8" />
      {/* Rear wheel arch */}
      <ellipse cx="165" cy="75" rx="18" ry="18" fill="#1e3a8a" />
      <ellipse cx="165" cy="75" rx="11" ry="11" fill="#e2e8f0" />
      <ellipse cx="165" cy="75" rx="5" ry="5" fill="#94a3b8" />
      {/* Headlight */}
      <rect x="19" y="50" width="12" height="8" rx="2" fill="#fef08a" stroke="#1e3a8a" strokeWidth="0.8" />
      {/* Taillight */}
      <rect x="189" y="50" width="12" height="8" rx="2" fill="#fca5a5" stroke="#1e3a8a" strokeWidth="0.8" />
      {/* Front bumper */}
      <rect x="14" y="60" width="12" height="6" rx="2" fill="#cbd5e1" stroke="#1e3a8a" strokeWidth="0.8" />
      {/* Rear bumper */}
      <rect x="194" y="60" width="12" height="6" rx="2" fill="#cbd5e1" stroke="#1e3a8a" strokeWidth="0.8" />
    </svg>
  )
}

/** MPV / MUV — Maruti Ertiga / Toyota Innova / KIA Carens */
function MPVSvg({ width = 220, height = 90 }: { width?: number; height?: number }) {
  return (
    <svg viewBox="0 0 240 95" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mpvBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
        <linearGradient id="mpvGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* Body */}
      <rect x="18" y="38" width="204" height="38" rx="7" fill="url(#mpvBody)" stroke="#1e3a8a" strokeWidth="1.5" />
      {/* Cabin */}
      <path d="M48 38 Q55 12 80 10 L190 10 Q210 12 215 38 Z" fill="url(#mpvBody)" stroke="#1e3a8a" strokeWidth="1.5" />
      {/* Windshield */}
      <path d="M62 37 Q68 17 84 15 L188 15 Q202 17 206 37 Z" fill="url(#mpvGlass)" stroke="#1e3a8a" strokeWidth="1" />
      {/* Three side windows */}
      <rect x="68" y="16" width="36" height="19" rx="2" fill="url(#mpvGlass)" stroke="#1e3a8a" strokeWidth="0.8" />
      <rect x="110" y="16" width="36" height="19" rx="2" fill="url(#mpvGlass)" stroke="#1e3a8a" strokeWidth="0.8" />
      <rect x="152" y="16" width="30" height="19" rx="2" fill="url(#mpvGlass)" stroke="#1e3a8a" strokeWidth="0.8" />
      {/* Door lines */}
      <line x1="106" y1="38" x2="108" y2="76" stroke="#1e3a8a" strokeWidth="0.8" opacity="0.4" />
      <line x1="148" y1="38" x2="150" y2="76" stroke="#1e3a8a" strokeWidth="0.8" opacity="0.4" />
      {/* Front wheel */}
      <ellipse cx="58" cy="78" rx="19" ry="19" fill="#1e3a8a" />
      <ellipse cx="58" cy="78" rx="11" ry="11" fill="#e2e8f0" />
      <ellipse cx="58" cy="78" rx="5" ry="5" fill="#94a3b8" />
      {/* Rear wheel */}
      <ellipse cx="180" cy="78" rx="19" ry="19" fill="#1e3a8a" />
      <ellipse cx="180" cy="78" rx="11" ry="11" fill="#e2e8f0" />
      <ellipse cx="180" cy="78" rx="5" ry="5" fill="#94a3b8" />
      {/* Headlight */}
      <rect x="19" y="46" width="13" height="9" rx="2" fill="#fef08a" stroke="#1e3a8a" strokeWidth="0.8" />
      {/* Taillight */}
      <rect x="208" y="46" width="13" height="9" rx="2" fill="#fca5a5" stroke="#1e3a8a" strokeWidth="0.8" />
      {/* Bumpers */}
      <rect x="14" y="58" width="12" height="7" rx="2" fill="#cbd5e1" stroke="#1e3a8a" strokeWidth="0.8" />
      <rect x="214" y="58" width="12" height="7" rx="2" fill="#cbd5e1" stroke="#1e3a8a" strokeWidth="0.8" />
    </svg>
  )
}

/** Tempo Traveller / Minibus */
function TempoSVG({ width = 240, height = 95 }: { width?: number; height?: number }) {
  return (
    <svg viewBox="0 0 260 100" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tempoBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
        <linearGradient id="tempoGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bbf7d0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Body */}
      <rect x="16" y="20" width="228" height="55" rx="6" fill="url(#tempoBody)" stroke="#166534" strokeWidth="1.5" />
      {/* Roof rack */}
      <rect x="30" y="16" width="200" height="6" rx="3" fill="#86efac" stroke="#166534" strokeWidth="1" />
      {/* Front cab */}
      <rect x="16" y="20" width="48" height="55" rx="4" fill="url(#tempoBody)" stroke="#166534" strokeWidth="1.5" />
      {/* Front windshield */}
      <rect x="22" y="26" width="36" height="24" rx="3" fill="url(#tempoGlass)" stroke="#166534" strokeWidth="1" />
      {/* Passenger windows — 4 rows */}
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={74 + i * 40} y="28" width="32" height="22" rx="2" fill="url(#tempoGlass)" stroke="#166534" strokeWidth="0.8" />
      ))}
      {/* Door line */}
      <line x1="68" y1="20" x2="68" y2="75" stroke="#166534" strokeWidth="1" opacity="0.5" />
      {/* Front wheel */}
      <ellipse cx="50" cy="79" rx="18" ry="18" fill="#166534" />
      <ellipse cx="50" cy="79" rx="10" ry="10" fill="#e2e8f0" />
      <ellipse cx="50" cy="79" rx="4" ry="4" fill="#94a3b8" />
      {/* Rear wheels (dual) */}
      <ellipse cx="202" cy="79" rx="18" ry="18" fill="#166534" />
      <ellipse cx="202" cy="79" rx="10" ry="10" fill="#e2e8f0" />
      <ellipse cx="202" cy="79" rx="4" ry="4" fill="#94a3b8" />
      {/* Headlight */}
      <rect x="18" y="42" width="11" height="8" rx="2" fill="#fef08a" stroke="#166534" strokeWidth="0.8" />
      {/* Taillight */}
      <rect x="231" y="42" width="11" height="8" rx="2" fill="#fca5a5" stroke="#166534" strokeWidth="0.8" />
    </svg>
  )
}

/** Generic car fallback */
function GenericCarSVG({ width = 220, height = 90 }: { width?: number; height?: number }) {
  return (
    <svg viewBox="0 0 220 90" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="genBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <rect x="18" y="44" width="184" height="30" rx="6" fill="url(#genBody)" stroke="#475569" strokeWidth="1.5" />
      <path d="M55 44 Q65 18 90 16 L138 16 Q162 18 168 44 Z" fill="url(#genBody)" stroke="#475569" strokeWidth="1.5" />
      <path d="M68 43 Q74 22 90 20 L138 20 Q152 22 156 43 Z" fill="#bae6fd" opacity="0.7" stroke="#475569" strokeWidth="0.8" />
      <ellipse cx="55" cy="75" rx="17" ry="17" fill="#334155" />
      <ellipse cx="55" cy="75" rx="9" ry="9" fill="#e2e8f0" />
      <ellipse cx="165" cy="75" rx="17" ry="17" fill="#334155" />
      <ellipse cx="165" cy="75" rx="9" ry="9" fill="#e2e8f0" />
      <rect x="18" y="52" width="11" height="7" rx="2" fill="#fef08a" stroke="#475569" strokeWidth="0.8" />
      <rect x="191" y="52" width="11" height="7" rx="2" fill="#fca5a5" stroke="#475569" strokeWidth="0.8" />
    </svg>
  )
}

export default function VehicleIllustration({ vehicleName, width, height, className }: VehicleIllustrationProps) {
  // Vehicle illustration removed per requirement: text vehicle name is preserved in invoice tables, no car drawing rendered
  return null
}
