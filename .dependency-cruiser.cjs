/**
 * Layering, enforced rather than trusted. The workspace is a stack:
 *
 *   core, theme   (leaves: pure TypeScript, no workspace deps)
 *   tui           (may use core, theme)
 *   plugins       (may use core, tui, theme)
 *   apps/*        (consume packages; never each other)
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'core-is-a-leaf',
      comment:
        'packages/core imports no other workspace package (invariant 5: the engine sits under everything).',
      severity: 'error',
      from: { path: '^packages/core/src' },
      to: { path: '^(packages/(?!core/)|apps/)' },
    },
    {
      name: 'theme-is-a-leaf',
      comment:
        'packages/theme imports no other workspace package: palettes and rendering stand alone.',
      severity: 'error',
      from: { path: '^packages/theme/' },
      to: { path: '^(packages/(?!theme/)|apps/)' },
    },
    {
      name: 'tui-uses-core-and-theme-only',
      comment: 'packages/tui may import core and theme, nothing else.',
      severity: 'error',
      from: { path: '^packages/tui/' },
      to: { path: '^(packages/(?!tui/|core/|theme/)|apps/)' },
    },
    {
      name: 'plugins-use-core-tui-theme-only',
      comment: 'packages/plugins may import core, tui and theme, nothing else.',
      severity: 'error',
      from: { path: '^packages/plugins/' },
      to: { path: '^(packages/(?!plugins/|core/|tui/|theme/)|apps/)' },
    },
    {
      name: 'packages-never-import-apps',
      comment:
        'Packages sit under the apps; nothing in packages/ reaches into apps/.',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'www-never-imports-desktop',
      comment:
        'The site imports shared packages, never apps/desktop (invariant 10: extract it to a package first).',
      severity: 'error',
      from: { path: '^apps/www/' },
      to: { path: '^apps/desktop/' },
    },
    {
      name: 'desktop-never-imports-www',
      comment: 'The desktop app never reaches into the marketing site.',
      severity: 'error',
      from: { path: '^apps/desktop/' },
      to: { path: '^apps/www/' },
    },
    {
      name: 'no-circular',
      comment:
        'No runtime import cycles. Type-only cycles are erased at build and tolerated (today: theme palette<->tokens, tui bar/types<->plugins).',
      severity: 'error',
      from: {},
      to: { circular: true, dependencyTypesNot: ['type-only'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: '(^|/)(dist|\\.next|out|target|gen)/|\\.generated\\.ts$',
    },
    tsPreCompilationDeps: true,
    // Resolution only (apps/www's @/* alias); @scuttlarr/* resolves via workspace exports.
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types'],
    },
  },
}
