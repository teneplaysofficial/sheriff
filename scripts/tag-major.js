import { execSync } from 'child_process'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
const version = pkg.version

if (version.includes('-')) {
  console.log(`Skipping major tag for prerelease version: ${version}`)
  process.exit(0)
}

const major = version.split('.')[0]

console.log(`Tagging major version: v${major}`)

execSync(`git tag -f v${major}`, { stdio: 'inherit' })
execSync(`git push -f origin v${major}`, { stdio: 'inherit' })
