<!-- vendored from the jig on 2026-08-24 -->

# AGENTS.md

The canonical standard for projects built on the jig. Self-contained: everything an agent (or a human) needs to work in a jig project is here or in the project's own `AGENTS.md`.

## Layering

**The jig is a stamp, not a runtime dependency.** At stamp time this file is copied into the project as `docs/STANDARDS.md`; from then on the in-repo copy is the operative standard for that repo. Nothing outside the repo is consulted — jig updates reach a project only through deliberate reconciliation, never ambiently.

Rules resolve in three tiers inside the repo, most specific wins:

1. **`docs/STANDARDS.md`** — the vendored standard (this file, as of the stamp).
2. **Project `AGENTS.md`** — identity, stack, invariants, and *deltas only*. Never restates the standard.
3. **Project `DEVIATIONS.md`** — where the project diverges from its standard: what, why, and the trigger that would reconverge it.

**Overrides are documented, never silent.** If a project does something differently, it says so in writing with a justification.

## Language & Runtime

- **TypeScript** for all application code. JavaScript (`.mjs`) is acceptable for lightweight zero-dependency scripts.
- **ESM only.** `"type": "module"` in every `package.json`. No CommonJS.
- **Node, current LTS.** Target **ES2022+** in `tsconfig.json`.
- **Bun is a scoped exception**: allowed only when a deliverable is a compiled single-file binary (`bun build --compile`). A repo containing *any* compiled-binary deliverable is a Bun repo: Bun for everything — workspaces, install, test, and its other apps (Hono and Next run fine under Bun) — one toolchain per repo, no hybrids. Record the choice in `DEVIATIONS.md`.

## Package Management

- **pnpm** (Bun projects excepted). Workspaces via `pnpm-workspace.yaml`; single-package repos still use pnpm.
- Keep dependencies minimal. Every dependency is a liability. Prefer the standard library.
- Pin major versions; `^` for minor/patch.
- Run `pnpm audit` before shipping. Don't ignore vulnerabilities.

## Code Style

Formatting is Prettier's job. Don't fight the formatter; always ship formatted code.

- `camelCase` variables/functions, `PascalCase` types/components, `SCREAMING_SNAKE_CASE` constants and env vars.
- Filenames: `kebab-case.ts` for modules, `PascalCase.tsx` for React components.
- Booleans read as predicates: `isLoading`, `hasError`, `shouldRetry`, `canPublish`.
- `const` over `let`, never `var`. Early returns over nesting. `async`/`await` over `.then()`.
- No unused variables; prefix intentionally unused parameters with `_`.
- Keep functions short and focused. If it needs a comment explaining *what* it does, it should be a well-named function instead. Comment only the non-obvious *why*.

## TypeScript

- **`strict: true` always**, plus `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `verbatimModuleSyntax`.
- Path aliases (`@/*` → `./src/*`) in app code.
- Prefer `type` over `interface` unless declaration merging is needed. Export types explicitly.
- No `any`. Use `unknown` and narrow.

## Frameworks

- **Next.js, static-first**, for marketing/public sites (`apps/www`). Prerender everything; step up to dynamic rendering only when the site genuinely needs it, recorded as a deviation.
- **Vite + React + shadcn** for product web apps. Apps with an admin panel start from [shadcn-admin](https://github.com/satnaing/shadcn-admin) — prune upstream cruft (its changelog, license, deploy configs) on adoption; it lints itself with its own config.
- **Hono** for APIs, with Zod contracts as the seam.
- **Neon Postgres, via the Vercel Marketplace integration**, whenever a database is needed. Default region `aws-ap-southeast-2` (Sydney) — a locality default, not an architectural one; change it per project freely, no deviation entry needed.
- **Better Auth** for authentication — always. Auth lives server-side in the API app; the browser sees only same-origin cookies.
- **Tailwind CSS** for styling.
- **Vanilla Node** for scripts and automation. Don't reach for a framework when a script will do.

## Testing — Red/Green/Refactor

All code changes follow **TDD**. Not optional.

1. **Red** — write a test describing the expected behavior. Run it. It must fail.
2. **Green** — write the minimum code to pass. Resist building ahead.
3. **Refactor** — clean up with tests green.

- **Vitest** (or `bun test` in Bun projects). Test files: `*.test.ts`.
- Test behavior, not implementation — tests should survive refactoring.
- Descriptive names: `it('returns null when user is not found')`.
- Don't mock what you don't own; wrap the dependency and mock the wrapper.
- Aim for meaningful coverage of the paths that matter, not 100%.
- Zero-dependency scripts may use `node --check` as a floor.

## One Gate

Every repo has a single **`verify`** command = typecheck + lint + test (plus project-specific checks). The pre-push hook runs it, CI runs it, and the definition of done references it. There is no second opinion.

## Error Handling

- Structured logging with context objects, not string concatenation.
- Catch errors at system boundaries; don't blanket every call in try/catch.
- APIs return structured errors with correct status codes. Scripts use a `fail()` helper that logs context and exits.
- Never silently swallow errors.

## Environment & Configuration

- Env vars for anything that changes between environments; validate at startup (Zod-parsed `src/env.ts`), no raw `process.env` elsewhere. `env.ts` is the manifest of what an app needs — the single source of truth, not an `.example` file.
- **Infisical is the env/secret source for every tier** — dev, prod, and operator credentials alike. One workspace per project; `.infisical.json` (workspace pointer, no secret material) is **committed**. Locally, direnv (`.envrc`, gitignored, per-machine) injects the dev environment into the shell via the Infisical CLI (`infisical login` once per machine). Deploy platforms get prod values through the Infisical integration or a synced export.
- **No real env value ever lives on disk** — not even gitignored. A `.env.*` file holding a real value is a migration not yet finished. Dotenv fallbacks in code are acceptable for offline work only; a shell-injected value always wins (dotenv never overrides).
- Operator credentials (prod DB passwords, deploy tokens, DNS keys) live in the workspace's prod environment and reach a local machine only through the CLI at time of use — never a `.env.infra.*` file.
- Local services bind **project-unique ports** (offset the default range per project) so multiple stacks coexist on one machine; record the ports in the project `AGENTS.md`.

## Git & Commits

- **Lefthook on every repo**: pre-commit formats/lints staged files (`stage_fixed`), commit-msg runs commitlint, pre-push runs `verify`. Never bypass with `--no-verify`; fix the failure.
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`). Explain the *why* — the diff already shows the what. No "update", "fix stuff", "WIP".
- Subject under 72 chars; body for anything non-trivial; one logical change per commit.
- Branches: `feat/description`, `fix/description`. PRs: same conventional format, description covers what/why/how-to-test/risks. Squash merge.

## Dependencies & Architecture

- Don't over-abstract. Three similar lines beat a premature abstraction.
- **Second-use rule**: extract a shared primitive only when a second consumer proves the need.
- Design for current requirements. **Defer with a trigger**: when you decide *not* to do something, write down what would change the decision ("adopt X when Y hurts").
- Keep the dependency tree shallow.

## Repository Topology

- One project = **one monorepo**: `apps/*` + `packages/*`.
- Marketing site lives in the repo (`apps/www`). Shared logic between app and site is a workspace package, never a hand-synced copy.
- The only external repos are **generated satellites** — release-pipeline outputs. Nobody develops in them; fix the generator, not the output. Homebrew distribution uses **one shared tap per owner** (`<owner>/homebrew-tap`, `Formula/` + `Casks/` side by side) — never a per-project `homebrew-<project>` repo.
- Splitting a surface into its own repo requires a written trigger (e.g. a privacy boundary that actually materializes).

## Security

- Never commit secrets. Public repos run a secret scanner (gitleaks) in hooks and CI.
- Validate input at boundaries. Parameterized queries only. The browser never talks to the database.

## CI/CD

- CI runs the same `verify` gate as the pre-push hook. Green hooks, green CI — no drift between them.
- **Deploy topology: one Vercel project per framework surface, two per product.** `www` (static Next) and the app project (Vite build + the Hono API as serverless functions in the same project — genuinely same-origin `/api/*`, no cross-project rewrites). Don't give the API its own project. Each project sets an Ignored Build Step so it only builds when its app changed.
- **After pushing, check the run.** Don't assume it passed. Fix red builds before moving on.
- Releases are tag-triggered: notes written first from a template, then tag → build → publish → fan-out jobs push to generated satellites, each no-oping honestly when unconfigured.

## The Docs System

Every project carries living state in `docs/`, updated **in the same commit** as the work it describes.

| File | Role | Discipline |
| --- | --- | --- |
| `STATUS.md` | The cursor: done / in progress / next / blocked | Short. A cursor, not a history — prune or archive past ~150 lines |
| `ROADMAP.md` | Phases and backlog | Items carry triggers, not dates |
| `JOURNAL.md` | Hard-won knowledge | Append-only, newest first; 1–2 lines each: symptom → cause → fix |
| `DECISIONS.md` | Lightweight ADRs | Append-only, newest first: decision, context, reasoning. Decided once — don't relitigate |
| `plans/` | Per-task plans | From `_TEMPLATE.md`; `active/` → `done/` in the closing commit |

**Docs link, never duplicate — single source of truth per fact.**

### Session Protocol

1. Orient on `STATUS.md` and `plans/active/`.
2. Plan before non-trivial work: copy `plans/_TEMPLATE.md`, fill it in.
3. Record decisions and gotchas **as they happen**, not at the end.
4. Close out: update `STATUS.md`, move the plan to `done/`, in the same commit as the code.

## Agent Discipline

- **Sessions die — protect against it.** Commit early at meaningful milestones; don't accumulate large uncommitted changes.
- **Debugging topology lock**: name the exact call topology, collect runtime evidence, stay on one hypothesis until confirmed or falsified, and restate contradictions before pivoting.
- Read only what you need. Don't dump verbose output into context.
- **If feedback changes the truth of a spec or plan, rewrite it cleanly from the top.** No fossilized patch sludge.

## Definition of Done

- `verify` green.
- New behavior has tests (written first).
- `STATUS.md` updated and the plan closed out in the same commit.
- Pushed, and CI confirmed green.
