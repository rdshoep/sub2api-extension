#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'
import Ajv from 'ajv'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')
const target = resolve(process.cwd(), process.argv[2] || resolve(repo, 'src/packs/sub2api.panel.yaml'))
const schema = JSON.parse(readFileSync(resolve(repo, 'schemas/panel-spec.schema.json'), 'utf8'))
const spec = parseYaml(readFileSync(target, 'utf8'))
const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)
const ok = validate(spec)
if (!ok) {
  console.error(validate.errors)
  process.exit(1)
}
console.log(JSON.stringify({ ok: true, file: target, pack: spec.pack }, null, 2))
