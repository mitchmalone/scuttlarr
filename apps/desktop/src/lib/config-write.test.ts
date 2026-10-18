import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Config } from './config'
import { updateConfig } from './config-write'

const invoke = vi.hoisted(() => vi.fn())
vi.mock('@tauri-apps/api/core', () => ({ invoke }))

type Disk = { theme: string; extra?: string }
let disk: Disk
const writes: Disk[] = []

beforeEach(() => {
  disk = { theme: 'a' }
  writes.length = 0
  invoke.mockReset()
  invoke.mockImplementation(async (cmd: string, args?: { config: Disk }) => {
    // yield so overlapping callers would interleave if not serialised
    await Promise.resolve()
    if (cmd === 'read_config') return structuredClone(disk)
    if (cmd === 'write_config' && args) {
      disk = structuredClone(args.config)
      writes.push(disk)
    }
    return undefined
  })
})

const d = (x: Config) => x as unknown as Disk
const cfg = (x: Disk) => x as unknown as Config

describe('updateConfig', () => {
  it('reads fresh and applies only the mutation', async () => {
    disk = { theme: 'a', extra: 'changed-elsewhere' }
    const out = await updateConfig((c) => cfg({ ...d(c), theme: 'b' }))
    expect(out).toEqual({ theme: 'b', extra: 'changed-elsewhere' })
    expect(disk).toEqual({ theme: 'b', extra: 'changed-elsewhere' })
  })

  it('serialises overlapping calls: the second sees the first write', async () => {
    const seen: string[] = []
    const first = updateConfig((c) => {
      seen.push(d(c).theme)
      return cfg({ ...d(c), theme: 'b' })
    })
    const second = updateConfig((c) => {
      seen.push(d(c).theme)
      return cfg({ ...d(c), extra: 'x' })
    })
    await Promise.all([first, second])
    expect(seen).toEqual(['a', 'b'])
    expect(disk).toEqual({ theme: 'b', extra: 'x' })
    expect(writes).toHaveLength(2)
  })

  it('a failed update does not block the queue', async () => {
    const bad = updateConfig(() => {
      throw new Error('nope')
    })
    await expect(bad).rejects.toThrow('nope')
    await updateConfig((c) => cfg({ ...d(c), theme: 'z' }))
    expect(disk.theme).toBe('z')
  })
})
