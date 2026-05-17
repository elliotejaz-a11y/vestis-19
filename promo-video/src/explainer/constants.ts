export const COLORS = {
  beige: '#F8F1E7',
  burgundy: '#7B2432',
  navy: '#0D2339',
  black: '#000000',
  white: '#FFFFFF',
} as const;

export const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";

// Composition
export const W = 1920;
export const H = 1080;

// Phone mockup (scaled from 440×955 original)
export const PHONE_W = 380;
export const PHONE_H = Math.round(PHONE_W * (955 / 440)); // 825
export const PHONE_RADIUS = Math.round(PHONE_W * (58 / 440)); // 50
export const SCREEN_INSET = 8;
export const SCREEN_RADIUS = 43;

// Timeline (frames at 60fps)
// Segment boundaries (global frames)
export const SEG1 = 0;    // Opening hook:       0 – 360
export const SEG2 = 360;  // Problem statement: 360 – 720
export const SEG3 = 720;  // Solution reveal:   720 – 1200
export const SEG4 = 1200; // CTA & closing:    1200 – 1800
export const TOTAL = 1800;

// Seg3 local frames (useCurrentFrame within Sequence from={SEG3})
export const S3_LOGO_START  = 60;   // 780 global
export const S3_LOGO_HOLD   = 130;  // 850 global
export const S3_F1_START    = 130;  // 850 global
export const S3_F1_END      = 250;  // 970 global
export const S3_F2_START    = 250;  // 970 global
export const S3_F2_END      = 370;  // 1090 global
export const S3_F3_START    = 370;  // 1090 global
export const S3_F3_END      = 480;  // 1200 global (seg3 duration)

// Seg4 local frames
export const S4_CAPTION1    = 0;    // 1200 global
export const S4_CAPTION2    = 80;   // 1280 global
export const S4_CAPTION3    = 150;  // 1350 global
export const S4_CTA         = 150;  // 1350 global
export const S4_FADE_START  = 550;  // 1750 global
