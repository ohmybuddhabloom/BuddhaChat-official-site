import { rename } from 'node:fs/promises'

await rename('dist/index.html', 'dist/spa.html')
