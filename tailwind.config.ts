import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#0B0D10",
          900: "#12151A",
          800: "#181C22",
          700: "#22272F",
          600: "#2E353F",
          500: "#454E5A",
          400: "#6B7480",
          300: "#98A1AB",
          200: "#C6CCD3",
          100: "#E9ECEF",
        },
        blueprint: {
          500: "#3D7EFF",
          400: "#5C93FF",
          300: "#8FB4FF",
        },
        signal: {
          critical: "#E5484D",
          high: "#F5A623",
          medium: "#E9C46A",
          low: "#6B7480",
          info: "#3D7EFF",
          ok: "#2FB380",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
