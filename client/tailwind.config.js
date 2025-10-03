/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/index.html","./client/src/**/*.{ts,tsx,js,jsx}","./index.html","./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f3efff",
          100: "#e7dfff",
          200: "#cdbfff",
          300: "#b19dff",
          400: "#8f73ff",
          500: "#6e49ff",   // primary
          600: "#5b3be0",
          700: "#4a31b8",
          800: "#39278f",
          900: "#2a1d6b"
        },
        dialer: {
          bg: '#1C1C1E',
          panel: '#232327',
          border: '#2D2D31',
          text: '#F5F5F5',
          muted: '#A3A3A3',
          icon: '#C9C9C9',
          pill: '#F59E0B',   // orange (SLF badge & consent)
          pillText: '#111111',
          pillBF: '#2563EB', // blue for BF badge if needed
        }
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" },
      boxShadow: { soft: "0 6px 20px rgba(20, 16, 40, 0.08)" }
    },
  },
  plugins: [],
}