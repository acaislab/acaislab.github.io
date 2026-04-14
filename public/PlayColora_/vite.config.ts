import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/playcolora/', // Perfecto para acaislab.com/playcolora
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
          maximumFileSizeToCacheInBytes: 5000000, // 5MB limit
          // ESTO ES VITAL PARA QUE FUNCIONE OFFLINE EN LA SUBCARPETA
          navigateFallback: '/playcolora/index.html', 
        },
        manifest: {
          name: 'Play Colora App',
          short_name: 'Play Colora',
          description: 'App Educativa Musical Colorida',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          // ESTO ES VITAL PARA QUE SE INSTALE DESDE LA SUBCARPETA
          start_url: '/playcolora/',
          scope: '/playcolora/',
          icons: [
            {
              src: 'favicon.ico',
              sizes: '64x64 32x32 24x24 16x16',
              type: 'image/x-icon',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ]
  };
});