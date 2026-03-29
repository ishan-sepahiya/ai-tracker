/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/_components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/(dashboard)/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/(auth)/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/(onboarding)/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        'ink-black': '#0d1b2a',
        'prussian-blue': '#1b263b',
        'dusk-blue': '#415a77',
        'dusty-denim': '#778da9',
        'alabaster-grey': '#e0e1dd',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
