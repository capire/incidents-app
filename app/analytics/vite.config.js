import { defineConfig } from 'vite'
import AdmZip from 'adm-zip'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/analytics/',
  plugins: [react(), {
      name: 'zip-dist', // zipping ./dist is required for BTP HTML5 repo or Application Frontend deployment
      closeBundle() {
        const zip = new AdmZip()
        zip.addLocalFolder('dist')
        zip.writeZip('dist/analytics.zip')
      }
  }],
  server: {
    proxy: {
      '/odata': 'http://localhost:4004'
    }
  }
})
