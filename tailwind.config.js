/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",   // penting: utility JS (statusBadge) ikut discan
    "./lib/**/*.{js,ts,jsx,tsx}",     // penting: helper/service ikut discan
  ],
  safelist: [
    // ===== Status/Next Status badge colors (anti-purge) =====
    "bg-blue-600",
    "bg-purple-600",
    "bg-indigo-600",
    "bg-pink-600",
    "bg-yellow-500",
    "bg-green-600",
    "bg-emerald-600",
    "bg-teal-600",
    "bg-orange-600",
    "bg-lime-600",
    "bg-red-600",
    "bg-red-800",
    "bg-gray-600",
    "bg-gray-800",
    "text-white",
    "text-black",
    // optional borders (kalau dipakai)
    "border-yellow-500",
    "border-green-600",
    "border-orange-600",
    "border-teal-600",
  ],
  theme: {
    extend: {
      colors: {
        "mplan-dark": "#0F172A",
        "mplan-light": "#F8FAFC",
        "mplan-gray": "#1E293B",
        "mplan-primary": "#3B82F6",
        "mplan-accent": "#22C55E",
        "mplan-warning": "#F59E0B",
        "mplan-danger": "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      zIndex: {
        60: "60",
        70: "70",
        80: "80",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
    },
  },
  plugins: [],
};
