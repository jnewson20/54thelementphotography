export const IMAGE_SIZES = {
  // Full-bleed sections (hero, page backgrounds, overlays)
  FULL_BLEED:
    "(max-width: 480px) 100vw, (max-width: 640px) 100vw, (max-width: 768px) 100vw, (max-width: 1024px) 100vw, (max-width: 1440px) 100vw, (max-width: 1920px) 100vw, (max-width: 2560px) 100vw, 3840px",
  // Two-column layouts where image occupies roughly half of desktop width
  HALF:
    "(max-width: 480px) 100vw, (max-width: 768px) 100vw, (max-width: 1024px) 88vw, (max-width: 1440px) 50vw, (max-width: 1920px) 45vw, 1600px",
  // Three-column/card layouts used in galleries and portfolio sections
  THIRD:
    "(max-width: 480px) 100vw, (max-width: 768px) 100vw, (max-width: 1200px) 50vw, (max-width: 1600px) 33vw, (max-width: 2560px) 25vw, 1100px",
  // Lightbox content where image is contained and never needs full 100vw on desktop
  LIGHTBOX:
    "(max-width: 480px) 100vw, (max-width: 768px) 98vw, (max-width: 1200px) 94vw, (max-width: 1600px) 88vw, (max-width: 2560px) 84vw, 2600px",
} as const;
