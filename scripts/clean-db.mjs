import fs from 'fs'
import path from 'path'

const root = process.cwd()
const targets = ['db.sqlite']

for (const name of targets) {
  const filePath = path.join(root, name)
  try {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true })
      console.log(`[clean-db] removed ${filePath}`)
    }
  } catch (e) {
    console.error(`[clean-db] failed to remove ${filePath}:`, e?.message || e)
  }
}
