#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2] || process.env.SUB2API_SRC || ''
const files = [
  'frontend/src/api/admin/accounts.ts',
  'frontend/src/api/admin/users.ts',
  'frontend/src/api/admin/dashboard.ts',
  'frontend/src/api/admin/ops.ts',
  'frontend/src/api/client.ts',
  'frontend/src/api/adminUIRequest.ts',
  'frontend/src/types/index.ts',
  'frontend/tailwind.config.js',
  'frontend/src/style.css',
  'skills/sub2api-admin/SKILL.md',
]

if (!root || !existsSync(root)) {
  console.log(JSON.stringify({
    ok: false,
    mode: 'remote-main-required',
    hint: 'Pass a local Sub2API checkout or fetch Wei-Shaw/sub2api main. Do not guess routes.',
    expectedFiles: files,
  }, null, 2))
  process.exit(0)
}

const report = files.map((rel) => {
  const full = join(root, rel)
  const present = existsSync(full)
  let paths = []
  if (present) {
    const text = readFileSync(full, 'utf8')
    paths = [...text.matchAll(/['"`](\/admin\/[^'"`]+)['"`]/g)].map((m) => m[1])
  }
  return { file: rel, present, sampleAdminPaths: [...new Set(paths)].slice(0, 20) }
})

console.log(JSON.stringify({
  ok: report.every((r) => r.present),
  capabilityReportRequired: true,
  readOnlyDiscovery: true,
  files: report,
}, null, 2))
