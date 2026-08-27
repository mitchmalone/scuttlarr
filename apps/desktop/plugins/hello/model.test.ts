import { describe, expect, it } from 'vitest'

import { initial, receive, tick } from './model'

/** The reference service's pure half (docs/PLUGINS.md). */
describe('hello service', () => {
  it('greets the configured name, or a sailor', () => {
    expect(initial('Mitch', 1).greeting).toBe('ahoy, Mitch')
    expect(initial(undefined, 1).greeting).toBe('ahoy, sailor')
    expect(initial('  ', 1).greeting).toBe('ahoy, sailor')
  })

  it('counts ticks and resets on request', () => {
    const s = tick(tick(initial('x', 1)))
    expect(s.ticks).toBe(2)
    expect(receive(s, { reset: true })).toMatchObject({
      ticks: 0,
      lastMessage: 'reset',
    })
    expect(receive(s, { hello: 1 }).lastMessage).toBe('{"hello":1}')
  })
})
