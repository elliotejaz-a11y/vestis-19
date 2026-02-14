interface Props {
  type: string;
  gender?: "male" | "female";
  className?: string;
}

export function BodySilhouette({ type, gender = "female", className = "w-12 h-20" }: Props) {
  if (gender === "male") return <MaleSilhouette type={type} className={className} />;
  return <FemaleSilhouette type={type} className={className} />;
}

function FemaleSilhouette({ type, className }: { type: string; className: string }) {
  return (
    <svg viewBox="0 0 80 160" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <ellipse cx="40" cy="14" rx="9" ry="10" />
      {/* Neck */}
      <rect x="36" y="24" width="8" height="6" rx="2" />
      {getFemaleTorso(type)}
      {getLegs(type, "female")}
    </svg>
  );
}

function MaleSilhouette({ type, className }: { type: string; className: string }) {
  return (
    <svg viewBox="0 0 80 160" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <ellipse cx="40" cy="14" rx="9" ry="10" />
      {/* Neck */}
      <rect x="35" y="24" width="10" height="6" rx="2" />
      {getMaleTorso(type)}
      {getLegs(type, "male")}
    </svg>
  );
}

function getFemaleTorso(type: string) {
  switch (type) {
    case "slim":
      return (
        <path d="M30 30 C30 30 27 32 26 36 L26 48 C26 50 27 54 28 56 L28 58 C27 60 26 64 26 68 L26 78 C26 80 27 82 29 82 L51 82 C53 82 54 80 54 78 L54 68 C54 64 53 60 52 58 L52 56 C53 54 54 50 54 48 L54 36 C53 32 50 30 50 30 Z" />
      );
    case "athletic":
      return (
        <path d="M24 30 C24 30 20 33 19 38 L20 50 C21 53 23 55 25 56 L26 58 C24 61 23 65 23 70 L24 82 L56 82 L57 70 C57 65 56 61 54 58 L55 56 C57 55 59 53 60 50 L61 38 C60 33 56 30 56 30 Z" />
      );
    case "average":
      return (
        <path d="M27 30 C27 30 24 33 23 38 L23 50 C23 53 25 56 26 57 L26 60 C25 63 24 67 24 72 L25 82 L55 82 L56 72 C56 67 55 63 54 60 L54 57 C55 56 57 53 57 50 L57 38 C56 33 53 30 53 30 Z" />
      );
    case "curvy":
      return (
        <path d="M26 30 C26 30 22 33 21 38 L21 46 C21 49 22 51 24 52 L27 54 C29 55 30 56 30 58 C30 60 28 62 26 63 L22 66 C20 68 19 72 19 76 L20 82 L60 82 L61 76 C61 72 60 68 58 66 L54 63 C52 62 50 60 50 58 C50 56 51 55 53 54 L56 52 C58 51 59 49 59 46 L59 38 C58 33 54 30 54 30 Z" />
      );
    case "plus-size":
      return (
        <path d="M24 30 C24 30 19 34 18 40 L17 50 C17 54 18 58 20 60 L20 64 C19 67 17 71 17 76 L18 82 L62 82 L63 76 C63 71 61 67 60 64 L60 60 C62 58 63 54 63 50 L62 40 C61 34 56 30 56 30 Z" />
      );
    case "tall":
      return (
        <path d="M28 30 C28 30 25 33 24 38 L24 52 C24 55 25 58 27 59 L27 62 C26 65 25 69 25 74 L26 82 L54 82 L55 74 C55 69 54 65 53 62 L53 59 C55 58 56 55 56 52 L56 38 C55 33 52 30 52 30 Z" />
      );
    case "petite":
      return (
        <path d="M28 30 C28 30 25 32 24 36 L24 46 C24 49 25 51 27 52 L27 54 C26 56 25 59 25 62 L25 82 L55 82 L55 62 C55 59 54 56 53 54 L53 52 C55 51 56 49 56 46 L56 36 C55 32 52 30 52 30 Z" />
      );
    case "inverted-triangle":
      return (
        <path d="M20 30 C20 30 16 34 15 40 L16 50 C17 53 19 55 22 56 L24 57 C26 58 28 60 28 62 L28 66 C28 70 29 76 30 82 L50 82 C51 76 52 70 52 66 L52 62 C52 60 54 58 56 57 L58 56 C61 55 63 53 64 50 L65 40 C64 34 60 30 60 30 Z" />
      );
    case "pear":
      return (
        <path d="M30 30 C30 30 28 32 27 36 L27 46 C27 49 28 51 29 52 L30 54 C28 56 26 59 24 62 L21 68 C19 72 18 76 18 80 L19 82 L61 82 L62 80 C62 76 61 72 59 68 L56 62 C54 59 52 56 50 54 L51 52 C52 51 53 49 53 46 L53 36 C52 32 50 30 50 30 Z" />
      );
    case "rectangle":
      return (
        <path d="M27 30 C27 30 24 33 23 38 L23 50 L23 60 L23 72 L24 82 L56 82 L57 72 L57 60 L57 50 L57 38 C56 33 53 30 53 30 Z" />
      );
    default:
      return (
        <path d="M27 30 C27 30 24 33 23 38 L23 50 C23 53 25 56 26 57 L26 60 C25 63 24 67 24 72 L25 82 L55 82 L56 72 C56 67 55 63 54 60 L54 57 C55 56 57 53 57 50 L57 38 C56 33 53 30 53 30 Z" />
      );
  }
}

function getMaleTorso(type: string) {
  switch (type) {
    case "slim":
      return (
        <path d="M29 30 C29 30 26 32 25 36 L25 50 C25 53 26 56 27 57 L27 60 C27 64 26 68 26 72 L27 82 L53 82 L54 72 C54 68 53 64 53 60 L53 57 C54 56 55 53 55 50 L55 36 C54 32 51 30 51 30 Z" />
      );
    case "athletic":
      return (
        <path d="M20 30 C20 30 15 34 14 40 L15 50 C16 54 19 57 22 58 L24 59 L24 62 C24 66 25 72 25 78 L26 82 L54 82 L55 78 C55 72 56 66 56 62 L56 59 L58 58 C61 57 64 54 65 50 L66 40 C65 34 60 30 60 30 Z" />
      );
    case "average":
      return (
        <path d="M25 30 C25 30 21 33 20 38 L20 50 C20 53 22 56 24 57 L25 59 L25 62 C24 66 24 72 24 78 L25 82 L55 82 L56 78 C56 72 56 66 55 62 L55 59 L56 57 C58 56 60 53 60 50 L60 38 C59 33 55 30 55 30 Z" />
      );
    case "curvy":
      // Male "curvy" = stocky/husky
      return (
        <path d="M23 30 C23 30 19 34 18 40 L18 50 C18 54 20 57 22 58 L23 60 C22 63 21 67 20 72 L21 82 L59 82 L60 72 C59 67 58 63 57 60 L58 58 C60 57 62 54 62 50 L62 40 C61 34 57 30 57 30 Z" />
      );
    case "plus-size":
      return (
        <path d="M22 30 C22 30 17 34 16 40 L15 50 C15 55 17 59 19 61 L19 65 C18 69 17 73 17 78 L18 82 L62 82 L63 78 C63 73 62 69 61 65 L61 61 C63 59 65 55 65 50 L64 40 C63 34 58 30 58 30 Z" />
      );
    case "tall":
      return (
        <path d="M27 30 C27 30 23 33 22 38 L22 54 C22 57 24 60 26 61 L26 64 C25 68 25 73 25 78 L26 82 L54 82 L55 78 C55 73 55 68 54 64 L54 61 C56 60 58 57 58 54 L58 38 C57 33 53 30 53 30 Z" />
      );
    case "petite":
      return (
        <path d="M28 30 C28 30 25 32 24 36 L24 48 C24 51 25 53 27 54 L27 56 C26 59 26 63 26 68 L26 82 L54 82 L54 68 C54 63 54 59 53 56 L53 54 C55 53 56 51 56 48 L56 36 C55 32 52 30 52 30 Z" />
      );
    case "inverted-triangle":
      return (
        <path d="M17 30 C17 30 12 34 11 40 L12 50 C13 54 16 57 20 58 L23 59 L24 62 C24 66 26 72 27 78 L28 82 L52 82 L53 78 C54 72 56 66 56 62 L57 59 L60 58 C64 57 67 54 68 50 L69 40 C68 34 63 30 63 30 Z" />
      );
    case "pear":
      return (
        <path d="M28 30 C28 30 25 33 24 38 L24 48 C24 51 25 53 27 54 L28 56 C26 59 24 63 22 68 L20 74 C19 78 19 80 20 82 L60 82 C61 80 61 78 60 74 L58 68 C56 63 54 59 52 56 L53 54 C55 53 56 51 56 48 L56 38 C55 33 52 30 52 30 Z" />
      );
    case "rectangle":
      return (
        <path d="M25 30 C25 30 22 33 21 38 L21 50 L21 60 L21 72 L22 82 L58 82 L59 72 L59 60 L59 50 L59 38 C58 33 55 30 55 30 Z" />
      );
    default:
      return (
        <path d="M25 30 C25 30 21 33 20 38 L20 50 C20 53 22 56 24 57 L25 59 L25 62 C24 66 24 72 24 78 L25 82 L55 82 L56 78 C56 72 56 66 55 62 L55 59 L56 57 C58 56 60 53 60 50 L60 38 C59 33 55 30 55 30 Z" />
      );
  }
}

function getLegs(type: string, gender: "male" | "female") {
  const isTall = type === "tall";
  const isPetite = type === "petite";
  const isPlusSize = type === "plus-size";
  const isPear = type === "pear";
  const isCurvy = type === "curvy" && gender === "female";

  // Leg width varies by type
  const thighWidth = isPlusSize || isPear || isCurvy ? 10 : type === "slim" ? 6 : 8;
  const calfWidth = isPlusSize ? 7 : type === "slim" ? 5 : 6;
  const legLength = isTall ? 74 : isPetite ? 56 : 66;
  const thighLen = legLength * 0.5;
  const calfLen = legLength * 0.5;

  const leftX = isPlusSize || isPear || isCurvy ? 22 : type === "slim" ? 28 : 26;
  const rightX = isPlusSize || isPear || isCurvy ? 48 : type === "slim" ? 46 : 46;

  const y = 82;

  return (
    <>
      {/* Left leg */}
      <path d={`M${leftX} ${y} 
        L${leftX - 1} ${y + thighLen} 
        C${leftX - 1} ${y + thighLen + 2} ${leftX} ${y + thighLen + 4} ${leftX + 1} ${y + thighLen + 4}
        L${leftX + 1} ${y + legLength - 4}
        C${leftX} ${y + legLength - 2} ${leftX - 1} ${y + legLength} ${leftX - 2} ${y + legLength + 2}
        L${leftX + thighWidth + 2} ${y + legLength + 2}
        C${leftX + thighWidth + 1} ${y + legLength} ${leftX + thighWidth} ${y + legLength - 2} ${leftX + thighWidth - 1} ${y + legLength - 4}
        L${leftX + calfWidth} ${y + thighLen + 4}
        C${leftX + calfWidth + 1} ${y + thighLen + 2} ${leftX + thighWidth} ${y + thighLen} ${leftX + thighWidth + 1} ${y + thighLen}
        L${leftX + thighWidth + 1} ${y}
        Z`} />
      {/* Right leg */}
      <path d={`M${rightX} ${y} 
        L${rightX - 1} ${y + thighLen} 
        C${rightX - 1} ${y + thighLen + 2} ${rightX} ${y + thighLen + 4} ${rightX + 1} ${y + thighLen + 4}
        L${rightX + 1} ${y + legLength - 4}
        C${rightX} ${y + legLength - 2} ${rightX - 1} ${y + legLength} ${rightX - 2} ${y + legLength + 2}
        L${rightX + thighWidth + 2} ${y + legLength + 2}
        C${rightX + thighWidth + 1} ${y + legLength} ${rightX + thighWidth} ${y + legLength - 2} ${rightX + thighWidth - 1} ${y + legLength - 4}
        L${rightX + calfWidth} ${y + thighLen + 4}
        C${rightX + calfWidth + 1} ${y + thighLen + 2} ${rightX + thighWidth} ${y + thighLen} ${rightX + thighWidth + 1} ${y + thighLen}
        L${rightX + thighWidth + 1} ${y}
        Z`} />
    </>
  );
}
