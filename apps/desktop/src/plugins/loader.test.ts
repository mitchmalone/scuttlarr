import { describe, expect, it } from 'vitest'

import { rewriteImports, shimSource } from './loader'

describe('rewriteImports', () => {
  const resolve = (spec: string) =>
    ({ react: 'blob:react', '@launcharr/tui': 'blob:tui' })[spec]

  it('rewrites known specifiers in every import form', () => {
    const src = [
      'import React, { useState } from "react";',
      "import { BarCell } from '@launcharr/tui';",
      'import "react";',
      'const lazy = () => import("react");',
      'import x from "./local.js";',
    ].join('\n')
    expect(rewriteImports(src, resolve)).toBe(
      [
        'import React, { useState } from "blob:react";',
        "import { BarCell } from 'blob:tui';",
        'import "blob:react";',
        'const lazy = () => import("blob:react");',
        'import x from "./local.js";',
      ].join('\n'),
    )
  })

  it('leaves strings that merely mention a module alone', () => {
    const src = 'const s = "react"; const t = `from "react"`;'
    expect(rewriteImports(src, resolve)).toBe(
      'const s = "react"; const t = `from "blob:react"`;',
    )
  })
})

describe('shimSource', () => {
  it('re-exports each identifier export from the shared global', () => {
    const src = shimSource('react', ['useState', 'default', 'not-valid', '$x'])
    expect(src).toContain('globalThis.__launcharrShared?.["react"]')
    expect(src).toContain('export const useState = m["useState"];')
    expect(src).toContain('export const $x = m["$x"];')
    expect(src).not.toContain('not-valid')
    expect(src.match(/export default/g)).toHaveLength(1)
  })
})
