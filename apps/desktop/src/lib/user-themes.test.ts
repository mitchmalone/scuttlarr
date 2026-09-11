import { BUILTIN_THEME_SOURCES } from '@scuttlarr/theme'
import { describe, expect, it } from 'vitest'

import { type UserTheme, mergeThemes, tokensOf } from './user-themes'

const theme = (name: string, text: string): UserTheme => ({
  name,
  text,
  handFiles: {},
  installed: false,
  dir: `/x/${name}`,
  backgrounds: [],
})

describe('mergeThemes', () => {
  it('derives tokens from a user colors.toml and layers it over config overrides', () => {
    const user = theme(
      'mine',
      BUILTIN_THEME_SOURCES.dracula!.replace(
        'accent = "#bd93f9"',
        'accent = "#ff00ff"',
      ),
    )
    const merged = mergeThemes(
      { themes: { mine: { accent: '#000000' }, other: { fg: '#1' } } },
      [user],
    )
    expect(merged?.mine?.bg).toBe('#282a36')
    expect(merged?.mine?.accent).toBe('#ff00ff') // the file wins over the token override
    expect(merged?.other).toEqual({ fg: '#1' })
  })
  it('skips a theme that does not parse instead of blanking the map', () => {
    const merged = mergeThemes({ themes: {} }, [
      theme('broken', 'background = #nope\n'),
    ])
    expect(merged?.broken).toBeUndefined()
    expect(tokensOf(theme('broken', '= =\n'))).toBeNull()
  })
})
