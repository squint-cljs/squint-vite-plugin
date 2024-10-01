import { defineConfig } from 'astro/config';
import squint from "vite-plugin-squint";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [squint()]
  }
});
