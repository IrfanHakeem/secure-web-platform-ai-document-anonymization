import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
)

const certificateDirectory = path.resolve(
  __dirname,
  '../certs',
)

const certificatePath = path.join(
  certificateDirectory,
  'localhost.pem',
)

const privateKeyPath = path.join(
  certificateDirectory,
  'localhost-key.pem',
)

const hasLocalCertificates =
  fs.existsSync(certificatePath) &&
  fs.existsSync(privateKeyPath)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    host: 'localhost',
    port: 5173,

    https: hasLocalCertificates
      ? {
          key: fs.readFileSync(
            privateKeyPath,
          ),
          cert: fs.readFileSync(
            certificatePath,
          ),
        }
      : undefined,
  },
})