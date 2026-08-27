/**
 * The reference plugin's pure half: state shape and transitions, no Bun, no
 * I/O — importable by the cell, the panel, and the tests alike
 * (docs/PLUGINS.md).
 */

export interface HelloState {
  greeting: string
  ticks: number
  lastMessage: string | null
  startedAt: number
}

/** Pure: the next state after one tick (tested in model.test.ts). */
export function tick(state: HelloState): HelloState {
  return { ...state, ticks: state.ticks + 1 }
}

/** Pure: the state after a message from the UI. */
export function receive(state: HelloState, message: unknown): HelloState {
  if (message && typeof message === 'object' && 'reset' in message) {
    return { ...state, ticks: 0, lastMessage: 'reset' }
  }
  return { ...state, lastMessage: JSON.stringify(message) }
}

export function initial(name: string | undefined, now: number): HelloState {
  return {
    greeting: `ahoy, ${name?.trim() || 'sailor'}`,
    ticks: 0,
    lastMessage: null,
    startedAt: now,
  }
}
