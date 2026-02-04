/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  // NativeWind preset disabled - not actually used in this app
  // presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
