interface Props {
  svgIcon: string;
  color: string;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  Black: "#1a1a1a",
  White: "#f5f5f5",
  Navy: "#1e3a5f",
  Beige: "#d4c5a9",
  Brown: "#6b4226",
  Red: "#c0392b",
  Blue: "#2980b9",
  Green: "#27ae60",
  Pink: "#e91e8e",
  Gray: "#7f8c8d",
  Burgundy: "#6b2737",
  Olive: "#556b2f",
  Cream: "#fffdd0",
  Tan: "#d2b48c",
  Charcoal: "#36454f",
};

export function PresetClothingSvg({ svgIcon, color, className = "" }: Props) {
  const fill = COLOR_MAP[color] || "#888";
  const stroke = color === "White" || color === "Cream" ? "#ccc" : "none";

  const svgs: Record<string, JSX.Element> = {
    tshirt: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M30 20 L20 30 L10 25 L20 50 L30 45 L30 85 L70 85 L70 45 L80 50 L90 25 L80 30 L70 20 L60 30 L40 30 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
      </svg>
    ),
    polo: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M30 20 L20 30 L10 25 L20 50 L30 45 L30 85 L70 85 L70 45 L80 50 L90 25 L80 30 L70 20 L60 28 L55 35 L50 28 L45 35 L40 28 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <line x1="50" y1="28" x2="50" y2="50" stroke={stroke || "#00000022"} strokeWidth="1"/>
      </svg>
    ),
    buttondown: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M30 15 L20 25 L10 20 L20 50 L30 45 L30 90 L70 90 L70 45 L80 50 L90 20 L80 25 L70 15 L58 25 L42 25 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <line x1="50" y1="25" x2="50" y2="90" stroke={stroke || "#00000015"} strokeWidth="1"/>
        <circle cx="50" cy="40" r="1.5" fill={stroke || "#00000030"}/>
        <circle cx="50" cy="55" r="1.5" fill={stroke || "#00000030"}/>
        <circle cx="50" cy="70" r="1.5" fill={stroke || "#00000030"}/>
      </svg>
    ),
    hoodie: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M30 20 L20 30 L8 25 L18 55 L30 48 L30 88 L70 88 L70 48 L82 55 L92 25 L80 30 L70 20 L60 30 L40 30 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <path d="M40 30 Q50 45 60 30" fill="none" stroke={stroke || "#00000020"} strokeWidth="1.5"/>
        <ellipse cx="50" cy="65" rx="8" ry="5" fill={stroke || "#00000010"} stroke={stroke || "#00000015"} strokeWidth="0.5"/>
      </svg>
    ),
    breton: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M30 20 L20 30 L10 25 L20 50 L30 45 L30 85 L70 85 L70 45 L80 50 L90 25 L80 30 L70 20 L60 30 L40 30 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <line x1="25" y1="40" x2="75" y2="40" stroke="#1e3a5f" strokeWidth="2"/>
        <line x1="28" y1="50" x2="72" y2="50" stroke="#1e3a5f" strokeWidth="2"/>
        <line x1="30" y1="60" x2="70" y2="60" stroke="#1e3a5f" strokeWidth="2"/>
        <line x1="30" y1="70" x2="70" y2="70" stroke="#1e3a5f" strokeWidth="2"/>
        <line x1="30" y1="80" x2="70" y2="80" stroke="#1e3a5f" strokeWidth="2"/>
      </svg>
    ),
    jeans: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M25 10 L25 50 L20 90 L45 90 L50 55 L55 90 L80 90 L75 50 L75 10 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
      </svg>
    ),
    chinos: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M27 10 L27 50 L22 90 L46 90 L50 55 L54 90 L78 90 L73 50 L73 10 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <line x1="50" y1="10" x2="50" y2="55" stroke={stroke || "#00000010"} strokeWidth="0.5"/>
      </svg>
    ),
    trousers: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M27 10 L27 50 L22 90 L46 90 L50 55 L54 90 L78 90 L73 50 L73 10 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <line x1="36" y1="10" x2="36" y2="90" stroke={stroke || "#00000008"} strokeWidth="0.5"/>
        <line x1="64" y1="10" x2="64" y2="90" stroke={stroke || "#00000008"} strokeWidth="0.5"/>
      </svg>
    ),
    joggers: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M25 10 Q24 50 28 90 L45 90 Q50 60 50 55 Q50 60 55 90 L72 90 Q76 50 75 10 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
      </svg>
    ),
    dress: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M40 10 L35 25 L25 90 L75 90 L65 25 L60 10 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <path d="M40 10 Q50 15 60 10" fill="none" stroke={stroke || "#00000020"} strokeWidth="1"/>
      </svg>
    ),
    jacket: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M30 15 L18 25 L8 20 L15 55 L28 48 L28 90 L48 90 L48 30 L52 30 L52 90 L72 90 L72 48 L85 55 L92 20 L82 25 L70 15 L58 25 L42 25 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
      </svg>
    ),
    blazer: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M30 15 L18 25 L8 20 L15 55 L28 48 L28 90 L72 90 L72 48 L85 55 L92 20 L82 25 L70 15 L58 25 L50 40 L42 25 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <line x1="50" y1="40" x2="50" y2="90" stroke={stroke || "#00000015"} strokeWidth="1"/>
        <circle cx="47" cy="55" r="1.5" fill={stroke || "#00000030"}/>
        <circle cx="47" cy="70" r="1.5" fill={stroke || "#00000030"}/>
      </svg>
    ),
    trench: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M28 12 L15 22 L5 18 L12 55 L26 48 L26 92 L74 92 L74 48 L88 55 L95 18 L85 22 L72 12 L58 22 L50 35 L42 22 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <line x1="50" y1="35" x2="50" y2="92" stroke={stroke || "#00000015"} strokeWidth="1"/>
        <line x1="35" y1="52" x2="65" y2="52" stroke={stroke || "#00000020"} strokeWidth="1.5"/>
      </svg>
    ),
    puffer: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M30 15 L18 25 L8 20 L15 55 L28 48 L28 88 L72 88 L72 48 L85 55 L92 20 L82 25 L70 15 L60 25 L40 25 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <line x1="20" y1="35" x2="80" y2="35" stroke={stroke || "#00000015"} strokeWidth="1"/>
        <line x1="22" y1="48" x2="78" y2="48" stroke={stroke || "#00000015"} strokeWidth="1"/>
        <line x1="28" y1="60" x2="72" y2="60" stroke={stroke || "#00000015"} strokeWidth="1"/>
        <line x1="28" y1="72" x2="72" y2="72" stroke={stroke || "#00000015"} strokeWidth="1"/>
      </svg>
    ),
    sneakers: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M15 55 L15 70 L85 70 L85 50 L70 40 L50 38 L30 42 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <path d="M15 70 L15 75 L90 75 L90 70 Z" fill={stroke || "#ddd"} stroke="none"/>
      </svg>
    ),
    dressshoes: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M20 50 L20 65 L85 65 L90 55 L70 42 L35 42 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <path d="M20 65 L20 70 L90 70 L90 65 Z" fill={stroke || "#333"} stroke="none"/>
      </svg>
    ),
    boots: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M30 20 L30 65 L15 65 L15 80 L75 80 L75 65 L60 65 L60 20 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <path d="M15 80 L15 85 L80 85 L80 80 Z" fill={stroke || "#333"} stroke="none"/>
      </svg>
    ),
    heels: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M25 30 L25 55 L15 55 L15 65 L60 65 L65 55 L40 55 L50 30 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <path d="M30 65 L28 85 L33 85 L35 65" fill={fill} stroke={stroke} strokeWidth="1"/>
      </svg>
    ),
    belt: (
      <svg viewBox="0 0 100 100" className={className}>
        <rect x="5" y="40" width="90" height="12" rx="3" fill={fill} stroke={stroke} strokeWidth="1"/>
        <rect x="42" y="37" width="16" height="18" rx="2" fill={stroke || "#c0c0c0"} stroke="#999" strokeWidth="0.5"/>
      </svg>
    ),
    watch: (
      <svg viewBox="0 0 100 100" className={className}>
        <rect x="38" y="10" width="24" height="20" rx="3" fill={fill} stroke={stroke || "#999"} strokeWidth="1"/>
        <circle cx="50" cy="50" r="20" fill={stroke || "#e0e0e0"} stroke={fill} strokeWidth="3"/>
        <circle cx="50" cy="50" r="16" fill="white" stroke="#ddd" strokeWidth="0.5"/>
        <line x1="50" y1="50" x2="50" y2="38" stroke="#333" strokeWidth="1.5"/>
        <line x1="50" y1="50" x2="58" y2="50" stroke="#333" strokeWidth="1"/>
        <rect x="38" y="70" width="24" height="20" rx="3" fill={fill} stroke={stroke || "#999"} strokeWidth="1"/>
      </svg>
    ),
    sunglasses: (
      <svg viewBox="0 0 100 100" className={className}>
        <ellipse cx="32" cy="50" rx="18" ry="14" fill={fill} stroke={stroke} strokeWidth="1"/>
        <ellipse cx="68" cy="50" rx="18" ry="14" fill={fill} stroke={stroke} strokeWidth="1"/>
        <line x1="50" y1="48" x2="50" y2="48" stroke={fill} strokeWidth="3"/>
        <path d="M50 48 Q50 44 50 48" stroke={fill} strokeWidth="2"/>
        <line x1="14" y1="45" x2="5" y2="40" stroke={fill} strokeWidth="2"/>
        <line x1="86" y1="45" x2="95" y2="40" stroke={fill} strokeWidth="2"/>
      </svg>
    ),
    scarf: (
      <svg viewBox="0 0 100 100" className={className}>
        <path d="M30 15 Q50 5 70 15 Q75 30 70 50 L65 80 L60 85 L55 80 L50 50 Q45 30 30 15 Z" fill={fill} stroke={stroke} strokeWidth="1"/>
        <path d="M30 15 Q25 30 30 50 L35 80 L40 85 L45 80 L50 50" fill={fill} stroke={stroke} strokeWidth="1" opacity="0.8"/>
      </svg>
    ),
  };

  return svgs[svgIcon] || svgs.tshirt;
}
