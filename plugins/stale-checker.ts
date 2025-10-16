import { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

export default function staleComponentChecker(): Plugin {
  return {
    name: 'vite-plugin-stale-checker',
    configureServer() {
      const forbiddenDirs = ['_graveyard', 'old_', 'backup_', '.backup', 'legacy', 'deprecated']
      const root = process.cwd()
      const clientRoot = path.join(root, 'client')

      // Check both root and client directories
      ;[root, clientRoot].forEach(checkRoot => {
        forbiddenDirs.forEach(dir => {
          const fullPath = path.join(checkRoot, 'src', dir)
          if (fs.existsSync(fullPath)) {
            console.warn(`🚨 FORBIDDEN: Stale directory detected: ${path.relative(root, fullPath)}`)
            console.warn(`   This directory should be completely removed or moved outside src/`)
          }
        })
      })

      // Check for stale cache directories
      const staleCacheDirs = ['.vite', 'dist', 'node_modules/.vite']
      staleCacheDirs.forEach(cacheDir => {
        ;[root, clientRoot].forEach(checkRoot => {
          const fullPath = path.join(checkRoot, cacheDir)
          if (fs.existsSync(fullPath)) {
            console.warn(`🧹 CACHE: Found ${cacheDir} in ${path.relative(root, checkRoot)}`)
            console.warn(`   Consider running: rm -rf ${path.relative(root, fullPath)} && npm run build`)
          }
        })
      })

      // Check for duplicate component files
      if (fs.existsSync(path.join(clientRoot, 'src'))) {
        this.checkForDuplicateComponents(path.join(clientRoot, 'src'))
      }
    },

    checkForDuplicateComponents(srcDir: string) {
      const componentMap = new Map<string, string[]>()
      
      const scanDirectory = (dir: string) => {
        try {
          const items = fs.readdirSync(dir, { withFileTypes: true })
          
          items.forEach(item => {
            if (item.isDirectory() && !item.name.startsWith('.') && item.name !== '_graveyard') {
              scanDirectory(path.join(dir, item.name))
            } else if (item.isFile() && item.name.endsWith('.tsx')) {
              const componentName = item.name.replace('.tsx', '')
              const fullPath = path.join(dir, item.name)
              
              if (!componentMap.has(componentName)) {
                componentMap.set(componentName, [])
              }
              componentMap.get(componentName)!.push(fullPath)
            }
          })
        } catch (error) {
          // Silently skip directories that can't be read
        }
      }

      scanDirectory(srcDir)

      // Report duplicates
      componentMap.forEach((paths, componentName) => {
        if (paths.length > 1) {
          console.warn(`🔄 DUPLICATE: Component '${componentName}' found in multiple locations:`)
          paths.forEach(p => console.warn(`   - ${p}`))
          console.warn(`   Consider consolidating to a single source of truth`)
        }
      })
    }
  }
}