import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    inspectAttr(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'logo.png'],
      manifest: {
        name: 'TypeNova - Next-Gen Gamified Typing',
        short_name: 'TypeNova',
        description: 'Next-Gen Gamified Typing Platform with AI Coach, RPG CyberHands, and Global Multiplayer.',
        theme_color: '#080809',
        background_color: '#080809',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone', 'window-controls-overlay'],
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,mp3,wav}']
      }
    })
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

