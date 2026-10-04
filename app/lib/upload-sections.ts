const SECTION_PATHS: Record<string, string[]> = {
  hero: ["hero"],
  "home-portfolio": ["home-portfolio"],
  "gallery-portrait": ["gallery", "portrait"],
  "gallery-wedding": ["gallery", "wedding"],
  "gallery-branding": ["gallery", "branding-media"],
  "client-login": ["client-login"],
  "client-cover": ["client-login"],
  "client-gallery": ["client-gallery"],
};

export function resolveSectionPath(section: unknown): string[] | null {
  return typeof section === "string" && Object.prototype.hasOwnProperty.call(SECTION_PATHS, section) ? SECTION_PATHS[section] : null;
}
