//! The Claude Code hook adapter, owned by launcharr rather than by a checkout.
//!
//! `hooks/claude-status.py` is compiled into the binary and installed to
//! `~/.config/launcharr/hooks/claude-status.py` — a stable path a user (or a
//! distro) can point at, and one that survives the repo moving. Registration
//! edits every Claude config dir's `settings.json` (`~/.claude`,
//! `~/.claude-*` — the same account convention usage.rs discovers) so each
//! lifecycle event runs the adapter. Two verbs, both idempotent:
//!
//! - `boot` (every launch, monitor on): keep the installed script current and
//!   **repair** entries that are ours but point elsewhere — a moved checkout,
//!   an older path. It never adds a registration: touching a user's Claude
//!   settings without being asked is the settings window's job.
//! - `install` (Settings → Agents): the script, plus a registration for every
//!   event in every account, with a one-time `settings.json.bak-launcharr`.
//!
//! "Ours" is any command ending in `/hooks/claude-status.py` (or the `.sh` it
//! replaced): the file name is the signature, the directory is incidental.
//! Everything else in `settings.json` is preserved verbatim, keys in order.

use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::{json, Value};

use crate::config;
use crate::error::{CmdError, CmdResult};

/// The adapter, verbatim from the repo — the bundle carries it so the app
/// never depends on where (or whether) a checkout exists.
pub const SCRIPT: &str = include_str!("../../hooks/claude-status.py");

/// Every Claude Code event the adapter maps (see `STATES` in the script).
pub const EVENTS: [&str; 10] = [
    "SessionStart",
    "UserPromptSubmit",
    "PreToolUse",
    "PostToolUse",
    "PermissionRequest",
    "Notification",
    "Stop",
    "SessionEnd",
    "SubagentStart",
    "SubagentStop",
];

const SIGNATURES: [&str; 2] = ["/hooks/claude-status.py", "/hooks/claude-status.sh"];
const BACKUP_SUFFIX: &str = ".bak-launcharr";

pub fn script_path() -> PathBuf {
    config::config_dir().join("hooks").join("claude-status.py")
}

/// Is this hook command one of ours, wherever it points?
pub fn is_ours(command: &str) -> bool {
    let command = command.trim();
    SIGNATURES.iter().any(|sig| command.ends_with(sig))
}

/// How one account's `settings.json` stands relative to `target`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum HookState {
    /// Every event runs the installed script.
    Registered,
    /// Ours is registered somewhere but at least one entry points elsewhere.
    Stale,
    /// Ours is registered for some events (at the right path) but not all.
    Partial,
    /// Not registered at all.
    Missing,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HookAccount {
    /// The config dir, `~`-shortened for display.
    pub dir: String,
    pub state: HookState,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HooksStatus {
    pub script_path: String,
    /// The installed file exists and matches the bundled adapter.
    pub script_current: bool,
    pub accounts: Vec<HookAccount>,
}

// ---- pure: settings.json surgery -------------------------------------------

/// Classify `settings` against `target` without changing it.
pub fn classify(settings: &Value, target: &str) -> HookState {
    let mut registered = 0usize;
    let mut stale = false;
    for event in EVENTS {
        let mut hit = false;
        for command in commands_for(settings, event) {
            if !is_ours(&command) {
                continue;
            }
            if command.trim() == target {
                hit = true;
            } else {
                stale = true;
            }
        }
        if hit {
            registered += 1;
        }
    }
    if stale {
        HookState::Stale
    } else if registered == EVENTS.len() {
        HookState::Registered
    } else if registered == 0 {
        HookState::Missing
    } else {
        HookState::Partial
    }
}

/// Rewrite every one of our entries to `target` and collapse duplicates
/// within an event. Adds nothing. Returns whether anything changed.
pub fn repair(settings: &mut Value, target: &str) -> bool {
    let mut changed = false;
    for event in EVENTS {
        changed |= retarget_event(settings, event, target);
    }
    changed
}

/// `repair`, then make sure every event has exactly one of our entries.
pub fn register(settings: &mut Value, target: &str) -> bool {
    let mut changed = repair(settings, target);
    for event in EVENTS {
        let present = commands_for(settings, event)
            .iter()
            .any(|c| c.trim() == target);
        if present {
            continue;
        }
        let groups = ensure_event(settings, event);
        groups.push(json!({ "hooks": [{ "type": "command", "command": target }] }));
        changed = true;
    }
    changed
}

/// All `command` strings registered under one event, in document order.
fn commands_for(settings: &Value, event: &str) -> Vec<String> {
    let mut out = Vec::new();
    let Some(groups) = settings
        .get("hooks")
        .and_then(|h| h.get(event))
        .and_then(Value::as_array)
    else {
        return out;
    };
    for group in groups {
        let Some(hooks) = group.get("hooks").and_then(Value::as_array) else {
            continue;
        };
        for hook in hooks {
            if let Some(command) = hook.get("command").and_then(Value::as_str) {
                out.push(command.to_owned());
            }
        }
    }
    out
}

/// Point every one of our commands under `event` at `target`; keep the first
/// and drop the rest (a repair after a manual re-add can leave two). Empty
/// groups left behind are removed so the file stays tidy.
fn retarget_event(settings: &mut Value, event: &str, target: &str) -> bool {
    let Some(groups) = settings
        .get_mut("hooks")
        .and_then(|h| h.get_mut(event))
        .and_then(Value::as_array_mut)
    else {
        return false;
    };
    let mut changed = false;
    let mut seen = false;
    for group in groups.iter_mut() {
        let Some(hooks) = group.get_mut("hooks").and_then(Value::as_array_mut) else {
            continue;
        };
        let before = hooks.len();
        hooks.retain_mut(|hook| {
            let Some(command) = hook.get("command").and_then(Value::as_str) else {
                return true;
            };
            if !is_ours(command) {
                return true;
            }
            if seen {
                return false;
            }
            seen = true;
            if command.trim() != target {
                hook["command"] = Value::String(target.to_owned());
                changed = true;
            }
            true
        });
        if hooks.len() != before {
            changed = true;
        }
    }
    let before = groups.len();
    groups.retain(|group| {
        group
            .get("hooks")
            .and_then(Value::as_array)
            .is_none_or(|hooks| !hooks.is_empty())
    });
    changed || groups.len() != before
}

/// `settings.hooks[event]` as a mutable array, creating the path as needed.
fn ensure_event<'a>(settings: &'a mut Value, event: &str) -> &'a mut Vec<Value> {
    if !settings.is_object() {
        *settings = json!({});
    }
    let root = settings.as_object_mut().expect("just made an object");
    let hooks = root.entry("hooks").or_insert_with(|| json!({}));
    if !hooks.is_object() {
        *hooks = json!({});
    }
    let groups = hooks
        .as_object_mut()
        .expect("just made an object")
        .entry(event)
        .or_insert_with(|| json!([]));
    if !groups.is_array() {
        *groups = json!([]);
    }
    groups.as_array_mut().expect("just made an array")
}

// ---- filesystem --------------------------------------------------------------

/// `~/.claude` first, then every `~/.claude-*` directory, alphabetical — the
/// account convention (usage.rs) without the identity lookup.
pub fn claude_config_dirs(home: &Path) -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    let default_dir = home.join(".claude");
    if default_dir.is_dir() {
        dirs.push(default_dir);
    }
    let mut extra: Vec<PathBuf> = std::fs::read_dir(home)
        .map(|rd| {
            rd.flatten()
                .map(|e| e.path())
                .filter(|p| p.is_dir())
                .filter(|p| {
                    p.file_name()
                        .and_then(|n| n.to_str())
                        .is_some_and(|n| n.starts_with(".claude-"))
                })
                .collect()
        })
        .unwrap_or_default();
    extra.sort();
    dirs.extend(extra);
    dirs
}

/// Write the bundled adapter to `path` if it differs; mode 0755. Returns
/// whether it was (re)written.
pub fn install_script_at(path: &Path) -> CmdResult<bool> {
    use std::os::unix::fs::PermissionsExt;
    let current = std::fs::read_to_string(path).ok();
    let executable = std::fs::metadata(path)
        .map(|m| m.permissions().mode() & 0o111 != 0)
        .unwrap_or(false);
    if current.as_deref() == Some(SCRIPT) && executable {
        return Ok(false);
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, SCRIPT)?;
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o755))?;
    Ok(true)
}

fn script_current(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    std::fs::read_to_string(path).ok().as_deref() == Some(SCRIPT)
        && std::fs::metadata(path)
            .map(|m| m.permissions().mode() & 0o111 != 0)
            .unwrap_or(false)
}

fn read_settings(path: &Path) -> CmdResult<Value> {
    match std::fs::read_to_string(path) {
        Ok(raw) if raw.trim().is_empty() => Ok(json!({})),
        Ok(raw) => serde_json::from_str(&raw)
            .map_err(|e| CmdError::Internal(format!("{}: {e}", path.display()))),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(json!({})),
        Err(e) => Err(e.into()),
    }
}

/// Pretty, two-space, trailing newline — the shape Claude Code writes itself.
fn write_settings(path: &Path, settings: &Value) -> CmdResult<()> {
    let mut out =
        serde_json::to_string_pretty(settings).map_err(|e| CmdError::Internal(e.to_string()))?;
    out.push('\n');
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, out)?;
    Ok(())
}

/// One-time safety copy before the first edit we ever make to a file.
fn backup_once(path: &Path) -> CmdResult<()> {
    let backup = PathBuf::from(format!("{}{BACKUP_SUFFIX}", path.display()));
    if path.is_file() && !backup.exists() {
        std::fs::copy(path, backup)?;
    }
    Ok(())
}

fn tilde(home: &Path, dir: &Path) -> String {
    match dir.strip_prefix(home) {
        Ok(rest) => format!("~/{}", rest.display()),
        Err(_) => dir.display().to_string(),
    }
}

fn home() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("/tmp"))
}

pub fn status() -> HooksStatus {
    let home = home();
    let script = script_path();
    let target = script.display().to_string();
    let accounts = claude_config_dirs(&home)
        .into_iter()
        .map(|dir| {
            let settings = read_settings(&dir.join("settings.json")).unwrap_or(json!({}));
            HookAccount {
                dir: tilde(&home, &dir),
                state: classify(&settings, &target),
            }
        })
        .collect();
    HooksStatus {
        script_current: script_current(&script),
        script_path: target,
        accounts,
    }
}

/// Settings → Agents "Install hooks": script + full registration everywhere.
pub fn install() -> CmdResult<HooksStatus> {
    let home = home();
    let script = script_path();
    install_script_at(&script)?;
    let target = script.display().to_string();
    for dir in claude_config_dirs(&home) {
        let path = dir.join("settings.json");
        let mut settings = read_settings(&path)?;
        if register(&mut settings, &target) {
            backup_once(&path)?;
            write_settings(&path, &settings)?;
            eprintln!("[launcharr hooks] registered in {}", path.display());
        }
    }
    Ok(status())
}

/// Every launch with monitoring on: keep the file fresh, mend our own stale
/// paths, add nothing. Failures are logged, never fatal — a status widget
/// must never block the app it lives in.
pub fn boot() {
    let script = script_path();
    match install_script_at(&script) {
        Ok(true) => eprintln!("[launcharr hooks] installed {}", script.display()),
        Ok(false) => {}
        Err(e) => {
            eprintln!("[launcharr hooks] install failed: {e}");
            return;
        }
    }
    let target = script.display().to_string();
    for dir in claude_config_dirs(&home()) {
        let path = dir.join("settings.json");
        let mut settings = match read_settings(&path) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("[launcharr hooks] {e}");
                continue;
            }
        };
        if repair(&mut settings, &target) {
            if let Err(e) = backup_once(&path).and_then(|()| write_settings(&path, &settings)) {
                eprintln!("[launcharr hooks] repair of {} failed: {e}", path.display());
            } else {
                eprintln!(
                    "[launcharr hooks] repaired stale hook paths in {}",
                    path.display()
                );
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const T: &str = "/Users/x/.config/launcharr/hooks/claude-status.py";
    const OLD: &str = "/Users/x/Developer/launcharr/apps/desktop/hooks/claude-status.py";

    fn entry(command: &str) -> Value {
        json!({ "hooks": [{ "type": "command", "command": command }] })
    }

    fn all_events(command: &str) -> Value {
        let mut hooks = serde_json::Map::new();
        for event in EVENTS {
            hooks.insert(event.to_owned(), json!([entry(command)]));
        }
        json!({ "hooks": hooks })
    }

    #[test]
    fn signature_is_the_file_name() {
        assert!(is_ours(OLD));
        assert!(is_ours(T));
        assert!(is_ours("/old/hooks/claude-status.sh"));
        assert!(!is_ours("/usr/local/bin/some-other-hook"));
        assert!(!is_ours("claude-status.py")); // no `/hooks/` — not ours
    }

    #[test]
    fn classify_all_four_states() {
        assert_eq!(classify(&json!({}), T), HookState::Missing);
        assert_eq!(classify(&all_events(T), T), HookState::Registered);
        assert_eq!(classify(&all_events(OLD), T), HookState::Stale);
        let partial = json!({ "hooks": { "Stop": [entry(T)] } });
        assert_eq!(classify(&partial, T), HookState::Partial);
        // One stale entry among nine good ones is still stale.
        let mut mixed = all_events(T);
        mixed["hooks"]["Stop"] = json!([entry(OLD)]);
        assert_eq!(classify(&mixed, T), HookState::Stale);
    }

    #[test]
    fn repair_retargets_ours_and_leaves_the_rest_alone() {
        let mut s = json!({
            "permissions": { "allow": ["Bash(ls)"] },
            "hooks": {
                "Stop": [
                    entry(OLD),
                    { "hooks": [{ "type": "command", "command": "/usr/bin/say done" }] }
                ],
                "PreCompact": [entry("/somewhere/else.sh")]
            }
        });
        assert!(repair(&mut s, T));
        assert_eq!(s["hooks"]["Stop"][0]["hooks"][0]["command"], T);
        assert_eq!(
            s["hooks"]["Stop"][1]["hooks"][0]["command"],
            "/usr/bin/say done"
        );
        assert_eq!(
            s["hooks"]["PreCompact"][0]["hooks"][0]["command"],
            "/somewhere/else.sh"
        );
        assert_eq!(s["permissions"]["allow"][0], "Bash(ls)");
        // Second pass: nothing to do.
        assert!(!repair(&mut s, T));
    }

    #[test]
    fn repair_never_adds() {
        let mut s = json!({ "hooks": { "Stop": [entry(OLD)] } });
        repair(&mut s, T);
        assert_eq!(classify(&s, T), HookState::Partial);
        assert!(s["hooks"].get("SessionStart").is_none());
    }

    #[test]
    fn repair_collapses_duplicates_of_ours() {
        let mut s = json!({ "hooks": { "Stop": [entry(OLD), entry(T)] } });
        assert!(repair(&mut s, T));
        let stop = s["hooks"]["Stop"].as_array().unwrap();
        assert_eq!(stop.len(), 1);
        assert_eq!(stop[0]["hooks"][0]["command"], T);
    }

    #[test]
    fn register_fills_every_event_once() {
        let mut s = json!({});
        assert!(register(&mut s, T));
        assert_eq!(classify(&s, T), HookState::Registered);
        for event in EVENTS {
            assert_eq!(s["hooks"][event].as_array().unwrap().len(), 1);
        }
        assert!(!register(&mut s, T));

        // Stale + partial → registered, with the foreign hook kept.
        let mut s = json!({ "hooks": { "Stop": [
            entry(OLD),
            { "hooks": [{ "type": "command", "command": "/usr/bin/say done" }] }
        ] } });
        assert!(register(&mut s, T));
        assert_eq!(classify(&s, T), HookState::Registered);
        let stop = s["hooks"]["Stop"].as_array().unwrap();
        assert_eq!(stop.len(), 2);
        assert_eq!(stop[1]["hooks"][0]["command"], "/usr/bin/say done");
    }

    #[test]
    fn register_tolerates_malformed_shapes() {
        let mut s = json!({ "hooks": "nope" });
        assert!(register(&mut s, T));
        assert_eq!(classify(&s, T), HookState::Registered);
        let mut s = json!({ "hooks": { "Stop": { "not": "an array" } } });
        assert!(register(&mut s, T));
        assert_eq!(classify(&s, T), HookState::Registered);
    }

    #[test]
    fn script_install_is_idempotent_and_executable() {
        use std::os::unix::fs::PermissionsExt;
        let dir = std::env::temp_dir().join(format!("launcharr-hooks-{}", std::process::id()));
        let path = dir.join("hooks").join("claude-status.py");
        assert!(install_script_at(&path).unwrap());
        assert!(!install_script_at(&path).unwrap());
        assert_eq!(std::fs::read_to_string(&path).unwrap(), SCRIPT);
        assert!(std::fs::metadata(&path).unwrap().permissions().mode() & 0o111 != 0);
        assert!(script_current(&path));
        // Drift (an edited copy) is rewritten.
        std::fs::write(&path, "#!/bin/sh\n").unwrap();
        assert!(install_script_at(&path).unwrap());
        assert_eq!(std::fs::read_to_string(&path).unwrap(), SCRIPT);
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn config_dirs_follow_the_account_convention() {
        let home =
            std::env::temp_dir().join(format!("launcharr-hooks-home-{}", std::process::id()));
        for d in [
            ".claude",
            ".claude-work",
            ".claude-abc",
            ".claudette",
            "other",
        ] {
            std::fs::create_dir_all(home.join(d)).unwrap();
        }
        let dirs = claude_config_dirs(&home);
        let names: Vec<_> = dirs
            .iter()
            .map(|d| d.file_name().unwrap().to_str().unwrap())
            .collect();
        assert_eq!(names, vec![".claude", ".claude-abc", ".claude-work"]);
        assert_eq!(tilde(&home, &dirs[1]), "~/.claude-abc");
        let _ = std::fs::remove_dir_all(home);
    }
}
