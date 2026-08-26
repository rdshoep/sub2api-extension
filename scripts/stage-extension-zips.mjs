#!/usr/bin/env node
import { mkdir, readdir, copyFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const outDir = join(root, '.output')
const destDir = join(root, 'site/downloads')

await mkdir(destDir, { recursive: true })
const files = (await readdir(outDir)).filter((name) => name.endsWith('.zip'))
if (!files.length) {
  throw new Error('No zip files in .output — run `pnpm zip:chrome` and `pnpm zip:edge` first')
}

async function pick(pattern, destName) {
  const match = files.find((name) => pattern.test(name))
  if (!match) return null
  const dest = join(destDir, destName)
  await copyFile(join(outDir, match), dest)
  return destName
}

const chrome = (await pick(/chrome/i, 'sub2api-console-chrome.zip')) ?? (await pick(/\.zip$/, 'sub2api-console-chrome.zip'))
if (!chrome) throw new Error('Chrome zip not found')
const edge = (await pick(/edge/i, 'sub2api-console-edge.zip')) ?? chrome
if (edge === chrome && !files.some((name) => /edge/i.test(name))) {
  await copyFile(join(destDir, chrome), join(destDir, 'sub2api-console-edge.zip'))
}

const latest = {
  version: pkg.version,
  generatedAt: new Date().toISOString(),
  chrome: 'sub2api-console-chrome.zip',
  edge: 'sub2api-console-edge.zip',
}
await writeFile(join(destDir, 'latest.json'), `${JSON.stringify(latest, null, 2)}\n`)
console.log(`Staged ${latest.chrome} and ${latest.edge} (v${latest.version})`)
