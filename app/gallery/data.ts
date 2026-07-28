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
      { src: "/assets/gallery/portrait/JQ-38.jpg", alt: "Portrait 1" },
      { src: "/assets/gallery/portrait/JQ-6.jpg", alt: "Portrait 2" },
      { src: "/assets/gallery/portrait/Kordaja%20Maternity-2.jpg", alt: "Portrait 3" }
    ],
  },
  {
    key: "wedding",
    title: "Wedding",
    images: [
      { src: "/assets/gallery/wedding/JQ%20Finals-9.jpg", alt: "Wedding 1" },
      { src: "/assets/gallery/wedding/The%20Walker's-124.jpg", alt: "Wedding 2" },
      { src: "/assets/gallery/wedding/The%20Walker's-346.jpg", alt: "Wedding 3" }
    ],
  },
  {
    key: "branding",
    title: "Branding",
    images: [
      { src: "/assets/gallery/branding-media/Du-16.jpg", alt: "Branding 1" },
      { src: "/assets/gallery/branding-media/Du-22.jpg", alt: "Branding 2" },
      { src: "/assets/gallery/branding-media/MSB-107.jpg", alt: "Branding 3" }
    ],
  },
];
