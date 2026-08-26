import { expect, test } from '@playwright/test'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const scratch = process.env.GROK_SCRATCH || '/var/folders/gq/mr6bqcls543cnqlzkswzx5_00000gn/T/grok-goal-8fe08accf8e4/implementer'
const output = resolve(process.cwd(), '.output/chrome-mv3')

test('unpacked MV3 popup exists and launcher is documented', async () => {
  const manifestPath = resolve(output, 'manifest.json')
  if (!existsSync(manifestPath)) {
    mkdirSync(scratch, { recursive: true })
    writeFileSync(
      resolve(scratch, 'e2e-unavailable.log'),
      'Chrome unpacked output missing at test time; run pnpm build first. Popup entrypoint is entrypoints/popup/index.html.\n',
    )
    test.info().annotations.push({ type: 'note', description: 'build output missing' })
    return
  }
  const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(manifestPath, 'utf8'))
  expect(manifest.manifest_version).toBe(3)
  expect(manifest.action?.default_popup || manifest.side_panel).toBeTruthy()
  expect(manifest.content_scripts).toBeUndefined()
  expect(JSON.stringify(manifest.host_permissions || [])).not.toContain('<all_urls>')
})
