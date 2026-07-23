export type PackageItem = {
  id: string;
  title: string;
  price: string;        // display price
  bullets: string[];    // features
  duration?: string;    // optional duration info
  note?: string;        // optional small note
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
};

export type ServiceGroup = {
  key: string;
  title: string;
  description?: string;
  packages: PackageItem[];
};

export const SERVICES: ServiceGroup[] = [
  {
    key: "portraits",
    title: "Portraits",
    description: "Studio and environmental portrait sessions tailored to your style.",
    packages: [
      {
        id: "portrait-basic",
        title: "Express",
        price: "$150",
        duration: "30 min",
        bullets: ["1 location", "5 edited images", "Online gallery"],
      },
      {
        id: "portrait-plus",
        title: "Leather",
        price: "$250",
        duration: "60 min",
        bullets: ["2 locations", "15 edited images", "Print release", "Styling advice"],
      },
      {
        id: "portrait-premium",
        title: "Cashmere",
        price: "$425",
        duration: "2 hours",
        bullets: ["On-location session", "40 edited images", "Retouching (5)", "Priority booking"],
        note: "Ideal for portfolios & creative campaigns",
      },
    ],
  },
  {
    key: "wedding",
    title: "Wedding",
    description: "Coverage and storytelling for your full wedding day or intimate elopements.",
    packages: [
      {
        id: "wedding-elopement",
        title: "Elopement",
        price: "$1,200",
        duration: "Up to 4 hours",
        bullets: ["Full coverage of ceremony & portraits", "200+ images (edited)", "Online gallery"],
      },
      {
        id: "wedding-classic",
        title: "Classic",
        price: "$2,800",
        duration: "8 hours",
        bullets: ["Getting ready to reception", "700+ images (edited)", "Second shooter available"],
      },
      {
        id: "wedding-premier",
        title: "Premier",
        price: "$5,000",
        duration: "Full day",
        bullets: ["Two photographers", "Custom album", "Engagement session", "Same-week highlight delivery"],
        note: "Custom add-ons and destination weddings available",
      },
    ],
  },
  {
    key: "branding",
    title: "Branding",
    description: "Creative brand sessions for founders, products, and campaigns.",
    packages: [
      {
        id: "branding-starter",
        title: "Starter",
        price: "$600",
        duration: "1 hour",
        bullets: ["10 styled images", "1 background", "Commercial usage"],
      },
      {
        id: "branding-growth",
        title: "Growth",
        price: "$1,400",
        duration: "3 hours",
        bullets: ["2 backgrounds", "30 images", "Product + lifestyle mix", "Usage guidance"],
      },
      {
        id: "branding-enterprise",
        title: "Enterprise",
        price: "$3,500",
        duration: "Full day",
        bullets: ["Creative direction", "Team shoots", "Campaign delivery", "Rights & licensing support"],
        note: "Ideal for launches and retainer partnerships",
      },
    ],
  },
];
