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
      { src: "/assets/about-1.jpg", alt: "Portrait 1" },
      { src: "/assets/about-1.jpg", alt: "Portrait 2" },
      { src: "/assets/about-1.jpg", alt: "Portrait 3" }
    ],
  },
  {
    key: "wedding",
    title: "Wedding",
    images: [
      { src: "/assets/about-1.jpg", alt: "Wedding 1" },
      { src: "/assets/about-1.jpg", alt: "Wedding 2" },
      { src: "/assets/about-1.jpg", alt: "Wedding 3" }
    ],
  },
  {
    key: "branding",
    title: "Branding",
    images: [
      { src: "/assets/about-1.jpg", alt: "Branding 1" },
      { src: "/assets/about-1.jpg", alt: "Branding 2" },
      { src: "/assets/about-1.jpg", alt: "Branding 3" }
    ],
  },
];
