/**
 * The reference service (docs/PLUGINS.md): long-lived under Bun, one JSON
 * line per state on stdout, `host.send()` messages arriving as JSON lines on
 * stdin. Everything that touches the world — clocks, files, shell-outs,
 * network — lives here, never in the cell or panel. The state logic is in
 * model.ts so it can be tested without Bun.
 */
import { initial, receive, tick } from './model'

if (import.meta.main) {
  let state = initial(process.env.HELLO_NAME, Math.floor(Date.now() / 1000))
  const emit = () => process.stdout.write(`${JSON.stringify(state)}\n`)
  emit()
  setInterval(() => {
    state = tick(state)
    emit()
  }, 5000)
  // stdin: one JSON message per line (host.send), `{"poke":true}` on a trigger.
  const reader = Bun.stdin.stream().getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const pump = async () => {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value)
      let nl = buffer.indexOf('\n')
      while (nl >= 0) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (line) {
          try {
            state = receive(state, JSON.parse(line))
            emit()
          } catch (e) {
            console.error(`bad message: ${line} (${e})`)
          }
        }
        nl = buffer.indexOf('\n')
      }
    }
  }
  pump().catch((e) => console.error(e))
}
