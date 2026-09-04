//! App-updates monitor (docs/plans/active/app-updates-plugin.md): a cached
//! report of what's outdated across every package manager installed on this
//! Mac — Homebrew, the App Store, pnpm, npm, mise. Modelled on usage.rs: a
//! cached read plus a background refresh on a long TTL, so the 1 Hz bar
//! snapshot never blocks on a shell-out. Every check is the user's own
//! package manager doing what it already does on `brew outdated` — no
//! request launcharr makes on its own behalf (DECISIONS 2026-09-04).

use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

/// A finished report is served from cache this long before a refresh kicks.
const CACHE_TTL: Duration = Duration::from_secs(6 * 3600);
/// A source's check command is killed if it runs longer than this.
const CHECK_TIMEOUT: Duration = Duration::from_secs(60);

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatesReport {
    /// Unix seconds of the last completed refresh; 0 = never run.
    pub generated_at: u64,
    /// A refresh is in flight (the cell/panel can show it).
    pub refreshing: bool,
    /// Only present sources (binary found on PATH), in table order.
    pub sources: Vec<UpdateSource>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSource {
    pub id: String,
    pub label: String,
    pub upgrade_command: String,
    /// Unix seconds; 0 if this source's first check hasn't finished.
    pub checked_at: u64,
    /// Last non-empty stderr line, or a timeout message; None while healthy.
    pub error: Option<String>,
    pub items: Vec<UpdateItem>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateItem {
    pub name: String,
    pub installed: String,
    pub available: String,
    pub kind: Option<String>,
}

static REPORT: Mutex<Option<(Instant, UpdatesReport)>> = Mutex::new(None);
static REFRESHING: AtomicBool = AtomicBool::new(false);

/// Cached report now; kicks a background refresh when never run or stale.
/// Never blocks — the bar's 1 Hz snapshot always reads the cache.
pub fn report() -> UpdatesReport {
    let stale = {
        let cache = REPORT.lock().unwrap();
        match cache.as_ref() {
            Some((at, _)) => at.elapsed() > CACHE_TTL,
            None => true,
        }
    };
    if stale {
        kick();
    }
    let mut r = REPORT
        .lock()
        .unwrap()
        .as_ref()
        .map(|(_, r)| r.clone())
        .unwrap_or_default();
    r.refreshing = REFRESHING.load(Ordering::Relaxed);
    r
}

/// Force a refresh now; a no-op while one is already in flight (`r` in the
/// panel, `touch triggers/plugin.updates`).
pub fn refresh() {
    kick();
}

/// After an upgrade is handed to the terminal the report is stale but we
/// can't see when the upgrade finishes — so re-check a couple of times on a
/// short fuse (brew takes a minute or two; a long cask install, longer)
/// instead of leaving the old count in the bar for the rest of the TTL.
pub fn refresh_after_upgrade() {
    std::thread::spawn(|| {
        for secs in [90, 300, 900] {
            std::thread::sleep(Duration::from_secs(secs));
            kick();
        }
    });
}

/// The shell command that upgrades one source (`SOURCES`' `upgrade_command`),
/// or — for `"all"` — every *present* source's command (binary locates, via
/// `locate`) joined with ` && ` in table order, so a failure stops the chain
/// rather than silently skipping ahead. `None` for an unknown source id.
pub fn upgrade_command(source: &str) -> Option<String> {
    if source == "all" {
        let joined = SOURCES
            .iter()
            .filter(|def| locate(def.binary).is_some())
            .map(|def| def.upgrade_command)
            .collect::<Vec<_>>()
            .join(" && ");
        return Some(joined);
    }
    SOURCES
        .iter()
        .find(|def| def.id == source)
        .map(|def| def.upgrade_command.to_string())
}

/// Kick the first scan at launch (lib.rs setup) so the cache is warm by the
/// time anything reads it.
pub fn start() {
    kick();
}

fn kick() {
    if REFRESHING.swap(true, Ordering::SeqCst) {
        return;
    }
    std::thread::spawn(|| {
        let report = scan();
        crate::logbook::breadcrumb("updates", &summary(&report));
        *REPORT.lock().unwrap() = Some((Instant::now(), report));
        REFRESHING.store(false, Ordering::SeqCst);
    });
}

/// One log line per refresh — the proof the check ran, and what it found
/// (`brew 3 · mas 0 · npm error: …`), without opening the panel.
fn summary(report: &UpdatesReport) -> String {
    let parts: Vec<String> = report
        .sources
        .iter()
        .map(|s| match &s.error {
            Some(e) => format!("{} error: {e}", s.id),
            None => format!("{} {}", s.id, s.items.len()),
        })
        .collect();
    if parts.is_empty() {
        "refreshed: no package managers found".to_string()
    } else {
        format!("refreshed: {}", parts.join(" · "))
    }
}

// ---- sources -----------------------------------------------------------

struct SourceDef {
    id: &'static str,
    label: &'static str,
    binary: &'static str,
    args: &'static [&'static str],
    upgrade_command: &'static str,
    parser: fn(&str) -> Result<Vec<UpdateItem>, String>,
}

/// Table order from the plan; the report preserves it.
const SOURCES: &[SourceDef] = &[
    SourceDef {
        id: "brew",
        label: "Homebrew",
        binary: "brew",
        args: &["outdated", "--json=v2"],
        upgrade_command: "brew upgrade",
        parser: parse_brew,
    },
    SourceDef {
        id: "mas",
        label: "App Store",
        binary: "mas",
        args: &["outdated"],
        upgrade_command: "mas upgrade",
        parser: parse_mas,
    },
    SourceDef {
        id: "pnpm",
        label: "pnpm",
        binary: "pnpm",
        args: &["outdated", "-g", "--json"],
        upgrade_command: "pnpm update -g",
        parser: parse_pnpm,
    },
    SourceDef {
        id: "npm",
        label: "npm",
        binary: "npm",
        args: &["outdated", "-g", "--json"],
        upgrade_command: "npm update -g",
        parser: parse_npm,
    },
    SourceDef {
        id: "mise",
        label: "mise",
        binary: "mise",
        args: &["outdated", "--json"],
        upgrade_command: "mise upgrade",
        parser: parse_mise,
    },
];

/// Every present source runs on its own thread, in parallel; the report is
/// assembled once all have finished (or timed out).
fn scan() -> UpdatesReport {
    let present: Vec<(&'static SourceDef, PathBuf)> = SOURCES
        .iter()
        .filter_map(|def| locate(def.binary).map(|bin| (def, bin)))
        .collect();
    let handles: Vec<_> = present
        .into_iter()
        .map(|(def, bin)| std::thread::spawn(move || check_source(def, &bin)))
        .collect();
    let sources = handles.into_iter().filter_map(|h| h.join().ok()).collect();
    UpdatesReport {
        generated_at: now_secs(),
        refreshing: false,
        sources,
    }
}

/// Run one source's check command and turn the outcome into a report row.
/// npm exits non-zero when packages are outdated — that's not an error, so
/// the parser is tried on stdout regardless of exit status; a parse failure
/// (or a timeout) is what makes a source `error`.
fn check_source(def: &'static SourceDef, bin: &Path) -> UpdateSource {
    let (items, error) = match run_check(bin, def.args, CHECK_TIMEOUT) {
        Err(e) => (Vec::new(), Some(e)),
        Ok((stdout, stderr)) => match (def.parser)(&stdout) {
            Ok(items) => (items, None),
            Err(parse_err) => (
                Vec::new(),
                Some(last_nonempty_line(&stderr).unwrap_or(parse_err)),
            ),
        },
    };
    UpdateSource {
        id: def.id.into(),
        label: def.label.into(),
        upgrade_command: def.upgrade_command.into(),
        checked_at: now_secs(),
        error,
        items,
    }
}

/// Find `bin` on PATH or under Homebrew (deps.rs, shared with the desktop
/// deps rows), plus the two homes deps.rs doesn't check: `~/.local/bin`
/// (pnpm's own installer) and mise's shim dir.
fn locate(bin: &str) -> Option<PathBuf> {
    if let Some(p) = crate::deps::locate(bin) {
        return Some(p);
    }
    let home = dirs::home_dir()?;
    [
        home.join(".local/bin"),
        home.join(".local/share/mise/shims"),
    ]
    .into_iter()
    .map(|d| d.join(bin))
    .find(|p| crate::deps::is_executable(p))
}

// ---- running the check command ------------------------------------------

/// Run a child to completion or `timeout`, capturing both streams regardless
/// of exit status (unlike widgets::run — several of these tools exit
/// non-zero on a normal "there are updates" result). Both pipes drain on
/// their own threads so a chatty child can't wedge on a full pipe.
fn run_check(bin: &Path, args: &[&str], timeout: Duration) -> Result<(String, String), String> {
    let mut child = Command::new(bin)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn failed: {e}"))?;
    let out_h = drain(child.stdout.take());
    let err_h = drain(child.stderr.take());
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) if started.elapsed() > timeout => {
                let _ = child.kill();
                let _ = child.wait();
                let _ = out_h.join();
                let _ = err_h.join();
                return Err(format!("timed out after {}s", timeout.as_secs()));
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(20)),
            Err(e) => return Err(format!("wait failed: {e}")),
        }
    }
    Ok((
        out_h.join().unwrap_or_default(),
        err_h.join().unwrap_or_default(),
    ))
}

fn drain<R: Read + Send + 'static>(pipe: Option<R>) -> std::thread::JoinHandle<String> {
    std::thread::spawn(move || {
        let mut out = String::new();
        if let Some(mut p) = pipe {
            let _ = p.read_to_string(&mut out);
        }
        out
    })
}

fn last_nonempty_line(s: &str) -> Option<String> {
    s.lines()
        .rev()
        .find(|l| !l.trim().is_empty())
        .map(|l| l.trim().to_owned())
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

// ---- parsers -------------------------------------------------------------
//
// Pure functions of stdout so they're testable against captured output
// without spawning anything.

/// `brew outdated --json=v2`: `formulae[]` + `casks[]`, each with `name`,
/// `installed_versions[0]`, `current_version`; pinned entries are skipped —
/// the user asked brew not to touch them.
fn parse_brew(stdout: &str) -> Result<Vec<UpdateItem>, String> {
    let v: serde_json::Value = serde_json::from_str(stdout).map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    for (key, kind) in [("formulae", "formula"), ("casks", "cask")] {
        let entries = v
            .get(key)
            .and_then(|a| a.as_array())
            .map(|a| a.as_slice())
            .unwrap_or_default();
        for entry in entries {
            if entry.get("pinned").and_then(|p| p.as_bool()) == Some(true) {
                continue;
            }
            let name = entry
                .get("name")
                .and_then(|n| n.as_str())
                .unwrap_or_default();
            if name.is_empty() {
                continue;
            }
            let installed = entry
                .get("installed_versions")
                .and_then(|v| v.as_array())
                .and_then(|a| a.first())
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            let available = entry
                .get("current_version")
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            items.push(UpdateItem {
                name: name.to_owned(),
                installed: installed.to_owned(),
                available: available.to_owned(),
                kind: Some(kind.to_owned()),
            });
        }
    }
    Ok(items)
}

/// `mas outdated`: one line per app, `<id> <Name> (<installed> -> <available>)`;
/// no output = nothing outdated. Names may contain spaces (and even "->"-like
/// dashes), so the id is taken as the first token and the version pair from
/// the last parenthesised group.
fn parse_mas(stdout: &str) -> Result<Vec<UpdateItem>, String> {
    let mut items = Vec::new();
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let bad = || format!("unparseable mas line: {line}");
        let (_id, rest) = line.split_once(' ').ok_or_else(bad)?;
        let open = rest.rfind('(').ok_or_else(bad)?;
        let name = rest[..open].trim();
        let inner = rest[open + 1..].trim_end_matches(')').trim();
        let (installed, available) = inner.split_once("->").ok_or_else(bad)?;
        if name.is_empty() {
            return Err(bad());
        }
        items.push(UpdateItem {
            name: name.to_owned(),
            installed: installed.trim().to_owned(),
            available: available.trim().to_owned(),
            kind: None,
        });
    }
    Ok(items)
}

/// `pnpm outdated -g --json`: stdout may open with a `[WARN] …` line before
/// the JSON object (observed on this machine, 2026-09-04) — parse from the
/// first `{`.
fn parse_pnpm(stdout: &str) -> Result<Vec<UpdateItem>, String> {
    let json = stdout
        .find('{')
        .map(|i| &stdout[i..])
        .ok_or("no JSON object in pnpm output")?;
    parse_keyed_versions(json)
}

/// `npm outdated -g --json`: same keyed-object shape as pnpm. npm's exit
/// code is not consulted here — a non-zero exit with parseable JSON is the
/// normal "there are outdated packages" result, not an error.
fn parse_npm(stdout: &str) -> Result<Vec<UpdateItem>, String> {
    parse_keyed_versions(stdout)
}

/// Shared shape for pnpm/npm: `{ "<name>": { "current": …, "latest": … } }`.
fn parse_keyed_versions(json: &str) -> Result<Vec<UpdateItem>, String> {
    let v: serde_json::Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
    let obj = v.as_object().ok_or("expected a JSON object")?;
    let mut items: Vec<UpdateItem> = obj
        .iter()
        .map(|(name, entry)| UpdateItem {
            name: name.clone(),
            installed: entry
                .get("current")
                .and_then(|s| s.as_str())
                .unwrap_or_default()
                .to_owned(),
            available: entry
                .get("latest")
                .and_then(|s| s.as_str())
                .unwrap_or_default()
                .to_owned(),
            kind: None,
        })
        .collect();
    items.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(items)
}

/// `mise outdated --json`: `{ "<tool>": { "name", "current", "latest", … } }`
/// over every tool mise manages, not only outdated ones — so, unlike
/// pnpm/npm, an entry only counts when `current` differs from `latest`.
fn parse_mise(stdout: &str) -> Result<Vec<UpdateItem>, String> {
    let v: serde_json::Value = serde_json::from_str(stdout).map_err(|e| e.to_string())?;
    let obj = v.as_object().ok_or("expected a JSON object")?;
    let mut items: Vec<UpdateItem> = obj
        .iter()
        .filter_map(|(key, entry)| {
            let name = entry
                .get("name")
                .and_then(|s| s.as_str())
                .unwrap_or(key)
                .to_owned();
            let installed = entry.get("current").and_then(|s| s.as_str())?.to_owned();
            let available = entry.get("latest").and_then(|s| s.as_str())?.to_owned();
            if installed == available {
                return None;
            }
            Some(UpdateItem {
                name,
                installed,
                available,
                kind: None,
            })
        })
        .collect();
    items.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(items)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_brew_outdated_json_v2() {
        let out = r#"{"formulae":[{"name":"gcc","installed_versions":["16.1.0"],"current_version":"16.2.0","pinned":false,"pinned_version":null}],"casks":[{"name":"repobar","installed_versions":["0.6.1"],"current_version":"0.8.7","pinned":false,"pinned_version":null}]}"#;
        let items = parse_brew(out).unwrap();
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].name, "gcc");
        assert_eq!(items[0].installed, "16.1.0");
        assert_eq!(items[0].available, "16.2.0");
        assert_eq!(items[0].kind.as_deref(), Some("formula"));
        assert_eq!(items[1].name, "repobar");
        assert_eq!(items[1].kind.as_deref(), Some("cask"));
    }

    #[test]
    fn brew_skips_pinned_entries() {
        let out = r#"{"formulae":[{"name":"node","installed_versions":["20.0.0"],"current_version":"22.0.0","pinned":true,"pinned_version":"20.0.0"}],"casks":[]}"#;
        assert_eq!(parse_brew(out).unwrap(), Vec::new());
        assert!(parse_brew("not json").is_err());
    }

    #[test]
    fn parses_mas_lines() {
        // No outdated App Store apps on this Mac when this was written
        // (`mas outdated`, 2026-09-04) — the empty case is the live capture;
        // the populated case follows mas's documented
        // `<id> <Name> (<installed> -> <available>)` format, including a
        // name with spaces.
        assert_eq!(parse_mas("").unwrap(), Vec::new());
        assert_eq!(parse_mas("\n\n").unwrap(), Vec::new());
        let out = parse_mas(
            "409183694 Keynote (13.2 -> 14.0)\n497799835 Bear – Markdown Notes (2.1 -> 2.2)\n",
        )
        .unwrap();
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].name, "Keynote");
        assert_eq!(out[0].installed, "13.2");
        assert_eq!(out[0].available, "14.0");
        assert_eq!(out[1].name, "Bear – Markdown Notes");
        assert_eq!(out[1].installed, "2.1");
        assert_eq!(out[1].available, "2.2");
        assert!(parse_mas("not a mas line at all").is_err());
    }

    #[test]
    fn parses_pnpm_outdated_json() {
        // Captured on this machine, 2026-09-04: a WARN line before the JSON.
        let clean = "[WARN] Using --global skips the package manager check for this project\n{}";
        assert_eq!(parse_pnpm(clean).unwrap(), Vec::new());
        let with_items = r#"{"typescript":{"current":"5.5.0","latest":"5.6.2"}}"#;
        let items = parse_pnpm(with_items).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].name, "typescript");
        assert_eq!(items[0].installed, "5.5.0");
        assert_eq!(items[0].available, "5.6.2");
        assert!(parse_pnpm("no brace here").is_err());
    }

    #[test]
    fn parses_npm_outdated_json_despite_nonzero_exit() {
        // Captured on this machine, 2026-09-04 (`npm outdated -g --json`
        // exits 1 while stdout is still valid JSON — that's not an error).
        let out = r#"{"corepack":{"current":"0.35.0","wanted":"0.36.0","latest":"0.36.0"}}"#;
        let items = parse_npm(out).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].name, "corepack");
        assert_eq!(items[0].installed, "0.35.0");
        assert_eq!(items[0].available, "0.36.0");
    }

    #[test]
    fn parses_mise_outdated_json_and_filters_unchanged() {
        // Captured on this machine, 2026-09-04 (`mise outdated --json`).
        let out = r#"{"npm:@openai/codex":{"name":"npm:@openai/codex","requested":"latest","current":"0.149.1","bump":null,"latest":"0.152.1","source":{"type":"mise.toml","path":"/Users/mitch/.config/mise/config.toml"}}}"#;
        let items = parse_mise(out).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].name, "npm:@openai/codex");
        assert_eq!(items[0].installed, "0.149.1");
        assert_eq!(items[0].available, "0.152.1");

        let unchanged = r#"{"node":{"name":"node","current":"24.0.0","latest":"24.0.0"}}"#;
        assert_eq!(parse_mise(unchanged).unwrap(), Vec::new());
    }

    #[test]
    fn run_check_reports_timeout() {
        let err =
            run_check(Path::new("/bin/sleep"), &["2"], Duration::from_millis(100)).unwrap_err();
        assert_eq!(err, "timed out after 0s");
    }

    #[test]
    fn run_check_captures_both_streams_regardless_of_exit_code() {
        // `sh -c 'echo out; echo err >&2; exit 1'` — a non-zero exit whose
        // stdout is still meaningful, exactly npm's shape.
        let (out, err) = run_check(
            Path::new("/bin/sh"),
            &["-c", "echo out; echo err >&2; exit 1"],
            Duration::from_secs(5),
        )
        .unwrap();
        assert_eq!(out.trim(), "out");
        assert_eq!(err.trim(), "err");
    }

    #[test]
    fn last_nonempty_line_skips_trailing_blanks() {
        assert_eq!(
            last_nonempty_line("line one\nline two\n\n"),
            Some("line two".into())
        );
        assert_eq!(last_nonempty_line("\n\n"), None);
        assert_eq!(last_nonempty_line(""), None);
    }

    #[test]
    fn locate_finds_a_system_binary_and_not_nonsense() {
        assert!(locate("ls").is_some());
        assert!(locate("definitely-not-a-real-binary-launcharr").is_none());
    }

    #[test]
    fn upgrade_command_looks_up_a_known_source_regardless_of_presence() {
        assert_eq!(upgrade_command("brew"), Some("brew upgrade".to_string()));
        assert_eq!(upgrade_command("mas"), Some("mas upgrade".to_string()));
        assert_eq!(upgrade_command("mise"), Some("mise upgrade".to_string()));
    }

    #[test]
    fn upgrade_command_unknown_source_is_none() {
        assert_eq!(upgrade_command("definitely-not-a-source"), None);
        assert_eq!(upgrade_command(""), None);
    }

    #[test]
    fn upgrade_command_all_joins_present_sources_in_table_order() {
        // Presence is machine-dependent, so mirror the function's own
        // `locate` filter rather than hardcoding a list of installed tools —
        // this still pins the join separator and the table-order guarantee.
        let expected = SOURCES
            .iter()
            .filter(|def| locate(def.binary).is_some())
            .map(|def| def.upgrade_command)
            .collect::<Vec<_>>()
            .join(" && ");
        assert_eq!(upgrade_command("all"), Some(expected));
    }
}
