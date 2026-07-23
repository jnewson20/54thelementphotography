export type GalleryCategory = {
  key: string;
  title: string;
  images: { src: string; alt?: string }[];
};

export const GALLERY: GalleryCategory[] = [
  {
    key: "portraits",
    title: "Portraits",
    images: [
      { src: "/assets/portraits-1.jpg", alt: "Portrait 1" },
      { src: "/assets/portraits-2.jpg", alt: "Portrait 2" },
      { src: "/assets/portraits-3.jpg", alt: "Portrait 3" }
    ],
  },
  {
    key: "wedding",
    title: "Wedding",
    images: [
      { src: "/assets/wedding-1.jpg", alt: "Wedding 1" },
      { src: "/assets/wedding-2.jpg", alt: "Wedding 2" },
      { src: "/assets/wedding-3.jpg", alt: "Wedding 3" }
    ],
  },
  {
    key: "branding",
    title: "Branding",
    images: [
      { src: "/assets/branding-1.jpg", alt: "Branding 1" },
      { src: "/assets/branding-2.jpg", alt: "Branding 2" },
      { src: "/assets/branding-3.jpg", alt: "Branding 3" }
    ],
  },
];
