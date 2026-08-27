import { describe, expect, it } from 'vitest'

import { jobs, rsyncArgs, view } from './model'

describe('mirror plugin', () => {
  it('needs a host and defaults the remote paths', () => {
    expect(jobs({}, '/Users/x')).toEqual([])
    const j = jobs({ MIRROR_HOST: 'beebee' }, '/Users/x')
    expect(j.map((x) => x.provider)).toEqual(['codex', 'claude'])
    expect(j[0]).toMatchObject({
      remote: '.codex/sessions',
      dest: '/Users/x/.local/share/launcharr/mirrors/beebee/codex/',
    })
    expect(
      jobs({ MIRROR_HOST: 'b', MIRROR_CODEX: '/srv/codex' }, '/h')[0]?.remote,
    ).toBe('/srv/codex')
  })

  it('syncs only journals, non-interactively', () => {
    const args = rsyncArgs(jobs({ MIRROR_HOST: 'beebee' }, '/h')[0]!)
    expect(args).toContain('--include=*.jsonl')
    expect(args).toContain('--exclude=*')
    expect(args.at(-2)).toBe('beebee:.codex/sessions/')
    expect(args.join(' ')).toContain('BatchMode=yes')
  })

  it('is hidden when healthy and red with a card when not', () => {
    const at = new Date(2026, 7, 28, 9, 0)
    expect(
      view('beebee', [{ provider: 'codex', ok: true, detail: 'synced' }], at),
    ).toEqual({
      hidden: true,
    })
    const v = view(
      'beebee',
      [
        { provider: 'codex', ok: true, detail: 'synced' },
        { provider: 'claude', ok: false, detail: 'Permission denied' },
      ],
      at,
    )
    expect(v).toMatchObject({ tone: 'error', label: '1' })
    expect(v.card?.rows?.[1]).toMatchObject({
      dot: 'error',
      hint: 'Permission denied',
    })
  })
})
