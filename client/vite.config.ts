import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
// OPTIMIZED FOR 10,000 USERS/MONTH - FREE TIER
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Build optimization
  build: {
    // Target modern browsers for smaller bundle
    target: 'es2020',

    // Minification
    minify: 'esbuild',

    // Source maps for debugging (small overhead)
    sourcemap: true,

    // Chunk size warning limit
    chunkSizeWarningLimit: 500,

    // Code splitting for optimal loading
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Vue core - rarely changes
          'vue-vendor': ['vue', 'vue-router', 'pinia'],

          // Heavy libraries - cached separately
          'canvas-vendor': ['konva', 'vue-konva'],
          'animation-vendor': ['gsap'],

          // UI utilities
          'ui-vendor': ['@vueuse/core'],
        },

        // Asset naming for long-term caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },

        // Chunk naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },

  // Development server
  server: {
    port: 5173,
    strictPort: false,
  },

  // Preview server (for production build testing)
  preview: {
    port: 4173,
  },
})
