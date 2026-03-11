import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'
import '../css/app.css'

createInertiaApp({
  title: (title) => `${title} — Rayosearch`,
  resolve: (name) =>
    resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
  progress: {
    color: '#5aa9ff',
  },
})
