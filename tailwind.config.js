module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b1220",
        surface: "#09111a",
        accent: "#00c2a8",
        muted: "#9aa6b2",
      },
      borderRadius: { xl: "12px" },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      
    },
  },
  plugins: [],
};
