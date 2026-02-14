interface Props {
  type: string;
  className?: string;
}

export function BodySilhouette({ type, className = "w-12 h-20" }: Props) {
  const svgProps = {
    viewBox: "0 0 60 100",
    fill: "currentColor",
    className,
    xmlns: "http://www.w3.org/2000/svg",
  };

  switch (type) {
    case "slim":
      return (
        <svg {...svgProps}>
          <circle cx="30" cy="10" r="7" />
          <path d="M26 18h8c2 0 3 1 3 3v20c0 1-0.5 2-1 2h-2l-1 30c0 1-1 2-2 2h-2c-1 0-2-1-2-2l-1-30h-2c-0.5 0-1-1-1-2V21c0-2 1-3 3-3z" />
          <path d="M22 70h5l-1 26c0 1-1 2-2 2s-2-1-2-2v-26z" />
          <path d="M33 70h5v26c0 1-1 2-2 2s-2-1-2-2l-1-26z" />
        </svg>
      );
    case "athletic":
      return (
        <svg {...svgProps}>
          <circle cx="30" cy="10" r="7" />
          <path d="M20 18h20c2 0 3 1 3 3v8l-3 2v10l-2 2h-3l-1 28c0 1-1 2-2 2h-4c-1 0-2-1-2-2l-1-28h-3l-2-2V31l-3-2v-8c0-2 1-3 3-3z" />
          <path d="M22 69h5l-1 27c0 1-1 2-2 2s-2-1-2-2v-27z" />
          <path d="M33 69h5v27c0 1-1 2-2 2s-2-1-2-2l-1-27z" />
        </svg>
      );
    case "average":
      return (
        <svg {...svgProps}>
          <circle cx="30" cy="10" r="7" />
          <path d="M22 18h16c2 0 3 1 3 3v12c0 1-0.5 2-1 2.5l-1 0.5v6l-1 1h-3l-1 28c0 1-1 2-2 2h-4c-1 0-2-1-2-2l-1-28h-3l-1-1v-6l-1-0.5c-0.5-0.5-1-1.5-1-2.5V21c0-2 1-3 3-3z" />
          <path d="M22 70h5l-1 26c0 1-1 2-2 2s-2-1-2-2v-26z" />
          <path d="M33 70h5v26c0 1-1 2-2 2s-2-1-2-2l-1-26z" />
        </svg>
      );
    case "curvy":
      return (
        <svg {...svgProps}>
          <circle cx="30" cy="10" r="7" />
          <path d="M22 18h16c2 0 3 1 3 3v6c0 2-1 3-2 4l-2 1c-1 2-1 3 0 5l3 2c1 1 2 2 2 4v2l-2 1h-5l-1 26c0 1-1 2-2 2h-4c-1 0-2-1-2-2l-1-26h-5l-2-1v-2c0-2 1-3 2-4l3-2c1-2 1-3 0-5l-2-1c-1-1-2-2-2-4v-6c0-2 1-3 3-3z" />
          <path d="M21 70h5l-1 26c0 1-1 2-2 2s-2-1-2-2v-26z" />
          <path d="M34 70h5v26c0 1-1 2-2 2s-2-1-2-2l-1-26z" />
        </svg>
      );
    case "plus-size":
      return (
        <svg {...svgProps}>
          <circle cx="30" cy="10" r="7" />
          <path d="M19 18h22c2 0 3 1 3 3v14c0 2-1 4-2 5v8c0 2-1 3-2 4l-1 1h-5l-1 24c0 1-1 2-2 2h-4c-1 0-2-1-2-2l-1-24h-5l-1-1c-1-1-2-2-2-4v-8c-1-1-2-3-2-5V21c0-2 1-3 3-3z" />
          <path d="M20 73h6l-1 23c0 1-1 2-2 2s-2-1-2.5-2l-0.5-23z" />
          <path d="M34 73h6l-0.5 23c-0.5 1-1.5 2-2.5 2s-2-1-2-2l-1-23z" />
        </svg>
      );
    case "tall":
      return (
        <svg {...svgProps} viewBox="0 0 60 110">
          <circle cx="30" cy="8" r="6" />
          <path d="M24 15h12c2 0 3 1 3 3v22c0 1-0.5 2-1 2h-3l-1 32c0 1-1 2-2 2h-4c-1 0-2-1-2-2l-1-32h-3c-0.5 0-1-1-1-2V18c0-2 1-3 3-3z" />
          <path d="M23 72h5l-1 34c0 1-1 2-2 2s-2-1-2-2v-34z" />
          <path d="M32 72h5v34c0 1-1 2-2 2s-2-1-2-2l-1-34z" />
        </svg>
      );
    case "petite":
      return (
        <svg {...svgProps} viewBox="0 0 60 85">
          <circle cx="30" cy="10" r="7" />
          <path d="M24 18h12c2 0 3 1 3 3v14c0 1-0.5 2-1 2h-2l-1 20c0 1-1 2-2 2h-6c-1 0-2-1-2-2l-1-20h-2c-0.5 0-1-1-1-2V21c0-2 1-3 3-3z" />
          <path d="M23 57h5l-0.5 22c0 1-1 2-2 2s-2-1-2-2l-0.5-22z" />
          <path d="M32 57h5l-0.5 22c0 1-1 2-2 2s-2-1-2-2l-0.5-22z" />
        </svg>
      );
    case "inverted-triangle":
      return (
        <svg {...svgProps}>
          <circle cx="30" cy="10" r="7" />
          <path d="M18 18h24c2 0 3 1 3 3v10l-4 3v4l-3 2h-2l-1 28c0 1-1 2-2 2h-4c-1 0-2-1-2-2l-1-28h-2l-3-2v-4l-4-3v-10c0-2 1-3 3-3z" />
          <path d="M24 68h4l-1 28c0 1-1 2-2 2s-1.5-1-1.5-2l0.5-28z" />
          <path d="M32 68h4l0.5 28c0 1-0.5 2-1.5 2s-2-1-2-2l-1-28z" />
        </svg>
      );
    case "pear":
      return (
        <svg {...svgProps}>
          <circle cx="30" cy="10" r="7" />
          <path d="M25 18h10c2 0 3 1 3 3v8c0 1 1 3 2 4l3 3c1 1 2 3 2 4v4l-2 1h-6l-1 26c0 1-1 2-2 2h-4c-1 0-2-1-2-2l-1-26h-6l-2-1v-4c0-1 1-3 2-4l3-3c1-1 2-3 2-4v-8c0-2 1-3 3-3z" />
          <path d="M21 71h5l-1 25c0 1-1 2-2 2s-2-1-2-2v-25z" />
          <path d="M34 71h5v25c0 1-1 2-2 2s-2-1-2-2l-1-25z" />
        </svg>
      );
    case "rectangle":
      return (
        <svg {...svgProps}>
          <circle cx="30" cy="10" r="7" />
          <path d="M22 18h16c2 0 3 1 3 3v22c0 1-0.5 2-1 2h-3l-1 26c0 1-1 2-2 2h-4c-1 0-2-1-2-2l-1-26h-3c-0.5 0-1-1-1-2V21c0-2 1-3 3-3z" />
          <path d="M22 69h5l-1 27c0 1-1 2-2 2s-2-1-2-2v-27z" />
          <path d="M33 69h5v27c0 1-1 2-2 2s-2-1-2-2l-1-27z" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <circle cx="30" cy="10" r="7" />
          <path d="M23 18h14c2 0 3 1 3 3v18c0 1-0.5 2-1 2h-3l-1 28c0 1-1 2-2 2h-4c-1 0-2-1-2-2l-1-28h-3c-0.5 0-1-1-1-2V21c0-2 1-3 3-3z" />
          <path d="M22 69h5l-1 27c0 1-1 2-2 2s-2-1-2-2v-27z" />
          <path d="M33 69h5v27c0 1-1 2-2 2s-2-1-2-2l-1-27z" />
        </svg>
      );
  }
}
