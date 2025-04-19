const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-preset-env": {
      features: {
        "oklch-function": true, // Enable oklch polyfill
      },
    },
  },
};

export default config;
