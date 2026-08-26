#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const id = args[args.indexOf('--id') + 1]
const out = args[args.indexOf('--out') + 1]
if (!id || !out || args.indexOf('--id') < 0) {
  console.error('Usage: scaffold-adapter.mjs --id <id> --out <dir>')
  process.exit(1)
}

const dir = resolve(process.cwd(), out)
mkdirSync(dir, { recursive: true })
writeFileSync(
  resolve(dir, 'adapter.ts'),
  `import type { PlatformAdapter } from '../../core/adapters/types'\n\nexport class ${id.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())}Adapter implements Partial<PlatformAdapter> {\n  readonly id = '${id}'\n  readonly version = 1\n}\n`,
)
writeFileSync(
  resolve(dir, 'adapter-manifest.json'),
  JSON.stringify({ id, version: 1, capabilities: ['platform.probe'], queries: [], actions: [] }, null, 2),
)
console.log(JSON.stringify({ ok: true, dir, note: 'Fill methods after a capability report. Do not embed secrets.' }, null, 2))
