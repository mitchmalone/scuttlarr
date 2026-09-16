//! Theme apply: the Omarchy mechanism on macOS (DECISIONS 2026-09-11).
//!
//! TypeScript renders (`@scuttlarr/theme`, pure); Rust receives finished bytes
//! and makes them true on disk, then tells the running world:
//!
//! 1. stage every rendered file under `<state>/next-theme/`, `rm -rf` the old
//!    `<state>/current/theme/`, rename the stage into place (one atomic move —
//!    a reader never sees a half-written theme), write `theme.name`;
//! 2. fan out reloads, each independent and fail-visible: OSC colour sequences
//!    into every pty the user owns + SIGWINCH (running shells retint — tmux or
//!    not, Ghostty or Terminal.app — with no permission), an opt-in Ghostty
//!    config reload over AppleScript, macOS appearance for the theme's mode,
//!    wallpaper, then the user's `~/.config/scuttlarr/hooks/theme-set.d/*`.
//!
//! Nothing here knows what a theme *is*; that's the renderer's business. Paths
//! are the contract: base configs import from `current/theme/<file>`.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::CmdResult;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeApply {
    pub name: String,
    /// "light" | "dark" — drives macOS appearance when `appearance` is set.
    pub mode: String,
    /// Relative path → contents, e.g. `ghostty` → the rendered Ghostty snippet.
    pub files: BTreeMap<String, String>,
    /// Terminal OSC sequences (10/11/12/17/19/4;n) for running shells; empty → skip.
    #[serde(default)]
    pub osc: String,
    /// Ask a running Ghostty to re-read its config over AppleScript (one Automation
    /// consent, first time). Off unless `config.appearance.ghostty`.
    #[serde(default)]
    pub ghostty_reload: bool,
    /// Flip macOS light/dark to match `mode`.
    #[serde(default)]
    pub appearance: bool,
    /// Absolute image paths the theme ships; each apply advances to the next one
    /// (Omarchy's `theme-bg-next`), remembered in `<state>/current/background`.
    #[serde(default)]
    pub backgrounds: Vec<String>,
    /// A Claude Code custom theme (rendered `claude.json`), written to
    /// `~/.claude/themes/scuttlarr.json` — the one file outside the state dir.
    #[serde(default)]
    pub claude: Option<String>,
    /// Hot editors (theme_editors.rs): off unless `config.appearance.editors`.
    #[serde(default)]
    pub editors: bool,
    /// Rendered `vscode-theme.json` — installed as a local extension for VS Code and Cursor.
    #[serde(default)]
    pub vscode: Option<String>,
    /// Rendered `zed-theme.json` → `~/.config/zed/themes/scuttlarr.json`.
    #[serde(default)]
    pub zed: Option<String>,
    /// Rendered `btop.theme` → `~/.config/btop/themes/scuttlarr.theme`.
    #[serde(default)]
    pub btop: Option<String>,
    /// `:colorscheme` for running Neovim servers.
    #[serde(default)]
    pub neovim_colorscheme: Option<String>,
    /// `theme = "…"` for Helix's config.toml.
    #[serde(default)]
    pub helix_theme: Option<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ThemeResult {
    /// `<state>/current/theme`
    pub path: String,
    pub reloaded: Vec<String>,
    /// (surface, why) — shown, never swallowed.
    pub failed: Vec<(String, String)>,
    /// Editors not installed or not running — nothing to do, not a failure.
    #[serde(default)]
    pub skipped: Vec<String>,
}

/// `<state>/current/theme` — what base configs import from.
pub fn current_dir(state: &Path) -> PathBuf {
    state.join("current").join("theme")
}

/// Stage + swap + name. Pure over `state`; tested against a scratch dir.
pub fn install(
    state: &Path,
    name: &str,
    files: &BTreeMap<String, String>,
) -> std::io::Result<PathBuf> {
    let current = state.join("current");
    std::fs::create_dir_all(&current)?;
    let stage = current.join("next-theme");
    let _ = std::fs::remove_dir_all(&stage);
    std::fs::create_dir_all(&stage)?;
    for (rel, body) in files {
        let rel = Path::new(rel);
        if rel.is_absolute()
            || rel
                .components()
                .any(|c| matches!(c, std::path::Component::ParentDir))
        {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("theme file path escapes the theme dir: {}", rel.display()),
            ));
        }
        let dest = stage.join(rel);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(dest, body)?;
    }
    let target = current_dir(state);
    let _ = std::fs::remove_dir_all(&target);
    std::fs::rename(&stage, &target)?;
    std::fs::write(current.join("theme.name"), format!("{name}\n"))?;
    Ok(target)
}

/// What `theme.name` says, if a theme has ever been applied.
pub fn current_name(state: &Path) -> Option<String> {
    std::fs::read_to_string(state.join("current").join("theme.name"))
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn tmux(args: &[&str]) -> Option<String> {
    let out = std::process::Command::new("tmux")
        .args(args)
        .output()
        .ok()?;
    out.status
        .success()
        .then(|| String::from_utf8_lossy(&out.stdout).into_owned())
}

/// The pseudo-terminals a user owns, from a `/dev` listing of (name, owner uid):
/// `ttysNNN` (three or more digits — the console `ttys0`…`ttysf` are root's)
/// whose owner is `uid`. Pure; `user_ttys` feeds it the real `/dev`.
pub fn pick_ttys<'a>(entries: impl Iterator<Item = (&'a str, u32)>, uid: u32) -> Vec<String> {
    let mut out: Vec<String> = entries
        .filter(|(name, owner)| {
            *owner == uid
                && name
                    .strip_prefix("ttys")
                    .is_some_and(|d| d.len() >= 3 && d.bytes().all(|b| b.is_ascii_digit()))
        })
        .map(|(name, _)| format!("/dev/{name}"))
        .collect();
    out.sort_unstable();
    out
}

/// Every `/dev/ttysNNN` owned by the user. "The user" is whoever owns `$HOME` —
/// the same uid, and it spares a libc binding for `getuid`.
fn user_ttys() -> Vec<String> {
    use std::os::unix::fs::MetadataExt;
    let Some(home) = dirs::home_dir() else {
        return Vec::new();
    };
    let Ok(uid) = std::fs::metadata(&home).map(|m| m.uid()) else {
        return Vec::new();
    };
    let Ok(dev) = std::fs::read_dir("/dev") else {
        return Vec::new();
    };
    let entries: Vec<(String, u32)> = dev
        .flatten()
        .filter_map(|e| {
            let owner = e.metadata().ok()?.uid();
            Some((e.file_name().to_string_lossy().into_owned(), owner))
        })
        .collect();
    pick_ttys(entries.iter().map(|(n, u)| (n.as_str(), *u)), uid)
}

/// Write the OSC payload to every terminal the user has open — each tmux pane's
/// tty plus every pty the user owns (Ghostty outside tmux, Terminal.app, …) — then
/// nudge each foreground process group with SIGWINCH so full-screen apps repaint.
/// Writing to a tty you own needs no permission: this is the zero-consent baseline.
fn retint_terminals(osc: &str) -> Result<usize, String> {
    let mut ttys: Vec<String> = user_ttys();
    if let Some(list) = tmux(&["list-panes", "-a", "-F", "#{pane_tty}"]) {
        ttys.extend(
            list.lines()
                .map(str::trim)
                .filter(|t| t.starts_with("/dev/"))
                .map(str::to_string),
        );
    }
    ttys.sort_unstable();
    ttys.dedup();
    let mut written = 0;
    for tty in &ttys {
        use std::io::Write;
        match std::fs::OpenOptions::new().write(true).open(tty) {
            Ok(mut f) => {
                if f.write_all(osc.as_bytes()).is_ok() {
                    written += 1;
                }
            }
            Err(_) => continue,
        }
        // ps -o tpgid= -t ttys003 → the foreground process group on that tty.
        let short = tty.trim_start_matches("/dev/");
        if let Ok(out) = std::process::Command::new("ps")
            .args(["-o", "tpgid=", "-t", short])
            .output()
        {
            for line in String::from_utf8_lossy(&out.stdout).lines() {
                if let Ok(pgid) = line.trim().parse::<i32>() {
                    if pgid > 0 {
                        // /bin/kill, not a libc binding: one fewer crate, and SIGWINCH is
                        // advisory — it cannot terminate a process that ignores it.
                        let _ = std::process::Command::new("/bin/kill")
                            .args(["-WINCH", "--", &format!("-{pgid}")])
                            .output();
                        break;
                    }
                }
            }
        }
    }
    // The OSC recolours pane contents; the status line, borders and message styles
    // are tmux options, so re-source just the theme's snippet (not the user's whole
    // config) into the running server — then redraw every client.
    let theme_conf = current_dir(&crate::config::state_dir()).join("tmux.conf");
    if theme_conf.is_file() {
        let _ = tmux(&["source-file", "-q", &theme_conf.to_string_lossy()]);
    }
    if let Some(clients) = tmux(&["list-clients", "-F", "#{client_name}"]) {
        for c in clients.lines().filter(|l| !l.trim().is_empty()) {
            let _ = tmux(&["refresh-client", "-t", c.trim()]);
        }
    }
    Ok(written)
}

/// How long an AppleScript may take before we stop waiting. A first `tell` to an app
/// blocks inside tccd until the Automation consent dialog is answered — seen live
/// 2026-09-16, a theme switch stalled for a minute with the editors never reached.
const OSASCRIPT_WAIT: std::time::Duration = std::time::Duration::from_secs(8);

/// Run a script, waiting at most `OSASCRIPT_WAIT`. On timeout the child is *left
/// running* — it is almost certainly waiting on a consent prompt, and once that is
/// answered it completes the action by itself — and the surface reports why.
fn osascript(script: &str) -> Result<(), String> {
    use std::process::Stdio;
    let mut child = std::process::Command::new("osascript")
        .args(["-e", script])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    let started = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let mut err = String::new();
                if let Some(mut e) = child.stderr.take() {
                    use std::io::Read;
                    let _ = e.read_to_string(&mut err);
                }
                return if status.success() {
                    Ok(())
                } else {
                    Err(err.trim().to_string())
                };
            }
            Ok(None) if started.elapsed() < OSASCRIPT_WAIT => {
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
            Ok(None) => {
                return Err(format!(
                    "no answer after {}s — probably waiting for a macOS Automation consent \
                     prompt; answer it and it completes on its own",
                    OSASCRIPT_WAIT.as_secs()
                ));
            }
            Err(e) => return Err(e.to_string()),
        }
    }
}

/// Ghostty 1.3+ (JOURNAL 2026-09-11): `perform action` needs a terminal target even
/// for an app-wide action, and `tell application` would *launch* Ghostty if it were
/// not running — so check for the process first and treat "not running" as nothing
/// to do. SIGUSR2, Omarchy's route, is Linux-only and kills Ghostty on macOS.
fn reload_ghostty() -> crate::theme_editors::Outcome {
    use crate::theme_editors::Outcome;
    let running = std::process::Command::new("pgrep")
        .args(["-xq", "ghostty"])
        .status()
        .map(|s| s.success())
        .unwrap_or(false);
    if !running {
        return Outcome::Skipped("ghostty not running".into());
    }
    match osascript(
        r#"tell application "Ghostty" to perform action "reload_config" on first terminal"#,
    ) {
        Ok(()) => Outcome::Done("ghostty (config reloaded)".into()),
        Err(e) if e.contains("-1728") => Outcome::Skipped("ghostty has no open terminal".into()),
        Err(e) => Outcome::Failed(e),
    }
}

fn set_appearance(dark: bool) -> Result<(), String> {
    osascript(&format!(
        r#"tell application "System Events" to tell appearance preferences to set dark mode to {dark}"#
    ))
}

fn short_name(path: &str) -> String {
    Path::new(path)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string())
}

/// The next background after the remembered one (wrapping); the first when none
/// is remembered or it left the list. Pure.
pub fn pick_next<'a>(backgrounds: &'a [String], current: Option<&str>) -> Option<&'a String> {
    if backgrounds.is_empty() {
        return None;
    }
    let idx = current
        .and_then(|c| backgrounds.iter().position(|b| b == c))
        .map(|i| (i + 1) % backgrounds.len())
        .unwrap_or(0);
    backgrounds.get(idx)
}

/// Advance the wallpaper: remember the list (`backgrounds.txt`, for `scuttlarr:wallpaper`)
/// and the choice (`background`), then set it.
pub fn wallpaper_next(state: &Path, backgrounds: &[String]) -> Result<String, String> {
    let current_dir = state.join("current");
    std::fs::create_dir_all(&current_dir).map_err(|e| e.to_string())?;
    let remembered = std::fs::read_to_string(current_dir.join("background"))
        .ok()
        .map(|s| s.trim().to_string());
    let next = pick_next(backgrounds, remembered.as_deref())
        .ok_or_else(|| "no backgrounds".to_string())?
        .clone();
    std::fs::write(
        current_dir.join("backgrounds.txt"),
        backgrounds.join("\n") + "\n",
    )
    .map_err(|e| e.to_string())?;
    set_wallpaper(&next)?;
    std::fs::write(current_dir.join("background"), format!("{next}\n"))
        .map_err(|e| e.to_string())?;
    Ok(next)
}

/// `scuttlarr — Next wallpaper`: cycle within the current theme's list.
pub fn wallpaper_next_current() -> CmdResult<String> {
    let state = crate::config::state_dir();
    let list: Vec<String> = std::fs::read_to_string(state.join("current").join("backgrounds.txt"))
        .map(|s| {
            s.lines()
                .filter(|l| !l.trim().is_empty())
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default();
    if list.is_empty() {
        return Err(crate::error::CmdError::NotFound(
            "the current theme ships no backgrounds".into(),
        ));
    }
    wallpaper_next(&state, &list).map_err(crate::error::CmdError::Internal)
}

fn set_wallpaper(path: &str) -> Result<(), String> {
    if !Path::new(path).is_file() {
        return Err(format!("no such file: {path}"));
    }
    let escaped = path.replace('\\', "\\\\").replace('"', "\\\"");
    osascript(&format!(
        r#"tell application "System Events" to tell every desktop to set picture to POSIX file "{escaped}""#
    ))
}

/// `~/.claude/themes/scuttlarr.json`: Claude Code picks it up as `custom:scuttlarr`
/// (the user selects it once; the file retints with every theme set).
fn write_claude_theme(body: &str) -> std::io::Result<PathBuf> {
    let dir = dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".claude")
        .join("themes");
    std::fs::create_dir_all(&dir)?;
    let path = dir.join("scuttlarr.json");
    std::fs::write(&path, body)?;
    Ok(path)
}

/// `~/.config/scuttlarr/hooks/theme-set.d/*` — executable, gets the theme name.
fn run_hooks(config_dir: &Path, name: &str) -> Vec<(String, String)> {
    let dir = config_dir.join("hooks").join("theme-set.d");
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Vec::new();
    };
    let mut paths: Vec<PathBuf> = entries
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.is_file())
        .collect();
    paths.sort();
    let mut failed = Vec::new();
    for p in paths {
        match std::process::Command::new(&p).arg(name).output() {
            Ok(out) if out.status.success() => {}
            Ok(out) => failed.push((
                p.display().to_string(),
                String::from_utf8_lossy(&out.stderr).trim().to_string(),
            )),
            Err(e) => failed.push((p.display().to_string(), e.to_string())),
        }
    }
    failed
}

/// Fan out to the hot editors, each independent (theme_editors.rs).
fn apply_editors(req: &ThemeApply, res: &mut ThemeResult) {
    use crate::theme_editors as ed;
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/tmp"));
    let xdg = home.join(".config");
    let mut fold = |surface: &str, outcome: ed::Outcome| match outcome {
        ed::Outcome::Done(what) => res.reloaded.push(what),
        ed::Outcome::Skipped(why) => res.skipped.push(why),
        ed::Outcome::Failed(why) => res.failed.push((surface.into(), why)),
    };
    if let Some(body) = req.vscode.as_deref() {
        for flavour in ed::vscode_flavours(&home) {
            fold(flavour.label, ed::apply_vscode(&flavour, body, &req.mode));
        }
    }
    if let Some(body) = req.zed.as_deref() {
        fold("zed", ed::apply_zed(&xdg.join("zed"), body));
    }
    if let Some(scheme) = req.neovim_colorscheme.as_deref() {
        fold("neovim", ed::apply_neovim(scheme, &req.mode));
    }
    if let Some(theme) = req.helix_theme.as_deref() {
        fold("helix", ed::apply_helix(&xdg.join("helix"), theme));
    }
    if let Some(body) = req.btop.as_deref() {
        fold("btop", ed::apply_btop(&xdg.join("btop"), body));
    }
}

pub fn apply(req: ThemeApply) -> CmdResult<ThemeResult> {
    let state = crate::config::state_dir();
    let path = install(&state, &req.name, &req.files)?;
    let mut res = ThemeResult {
        path: path.display().to_string(),
        ..Default::default()
    };
    // The OSC retint first: no consent, every terminal. The Ghostty reload goes
    // *last* (below) — its first run blocks on a consent dialog, and nothing
    // else should wait behind it.
    if !req.osc.is_empty() {
        match retint_terminals(&req.osc) {
            Ok(n) => res.reloaded.push(format!("terminals ({n} ttys)")),
            Err(e) => res.failed.push(("terminals".into(), e)),
        }
    }
    if req.appearance {
        match set_appearance(req.mode != "light") {
            Ok(()) => res
                .reloaded
                .push(format!("macOS appearance ({})", req.mode)),
            Err(e) => res.failed.push(("macOS appearance".into(), e)),
        }
    }
    if !req.backgrounds.is_empty() {
        match wallpaper_next(&state, &req.backgrounds) {
            Ok(p) => res.reloaded.push(format!("wallpaper ({})", short_name(&p))),
            Err(e) => res.failed.push(("wallpaper".into(), e)),
        }
    } else {
        let _ = std::fs::remove_file(state.join("current").join("backgrounds.txt"));
    }
    if let Some(body) = req.claude.as_deref() {
        match write_claude_theme(body) {
            Ok(p) => res.reloaded.push(format!("claude code ({})", p.display())),
            Err(e) => res.failed.push(("claude code".into(), e.to_string())),
        }
    }
    if req.editors {
        apply_editors(&req, &mut res);
    }
    let hook_failures = run_hooks(&crate::config::config_dir(), &req.name);
    if hook_failures.is_empty() {
        res.reloaded.push("hooks".into());
    }
    res.failed.extend(hook_failures);
    if req.ghostty_reload {
        use crate::theme_editors::Outcome;
        match reload_ghostty() {
            Outcome::Done(what) => res.reloaded.push(what),
            Outcome::Skipped(why) => res.skipped.push(why),
            Outcome::Failed(why) => res.failed.push(("ghostty".into(), why)),
        }
    }
    for (what, why) in &res.failed {
        eprintln!("[scuttlarr theme] {what}: {why}");
    }
    Ok(res)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch() -> PathBuf {
        // A counter, not the clock: two tests starting in the same microsecond
        // shared a dir and raced each other's atomic swap (flaked 2026-09-16).
        static N: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
        let d = std::env::temp_dir().join(format!(
            "scuttlarr-theme-{}-{}",
            std::process::id(),
            N.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
        ));
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    fn files(pairs: &[(&str, &str)]) -> BTreeMap<String, String> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn install_stages_then_swaps_and_names() {
        let s = scratch();
        let dir = install(
            &s,
            "dracula",
            &files(&[("ghostty", "background = #282a36\n"), ("sub/x", "1")]),
        )
        .unwrap();
        assert_eq!(dir, current_dir(&s));
        assert_eq!(
            std::fs::read_to_string(dir.join("ghostty")).unwrap(),
            "background = #282a36\n"
        );
        assert_eq!(std::fs::read_to_string(dir.join("sub/x")).unwrap(), "1");
        assert!(
            !s.join("current/next-theme").exists(),
            "stage dir is gone after the swap"
        );
        assert_eq!(current_name(&s).as_deref(), Some("dracula"));
    }

    #[test]
    fn a_second_install_replaces_everything() {
        let s = scratch();
        install(&s, "a", &files(&[("old", "x")])).unwrap();
        install(&s, "b", &files(&[("new", "y")])).unwrap();
        let dir = current_dir(&s);
        assert!(!dir.join("old").exists());
        assert!(dir.join("new").exists());
        assert_eq!(current_name(&s).as_deref(), Some("b"));
    }

    #[test]
    fn pick_next_cycles_and_recovers() {
        let bg = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        assert_eq!(pick_next(&bg, None).map(String::as_str), Some("a"));
        assert_eq!(pick_next(&bg, Some("a")).map(String::as_str), Some("b"));
        assert_eq!(pick_next(&bg, Some("c")).map(String::as_str), Some("a"));
        assert_eq!(pick_next(&bg, Some("gone")).map(String::as_str), Some("a"));
        assert_eq!(pick_next(&[], Some("a")), None);
    }

    #[test]
    fn pick_ttys_keeps_the_users_ptys_and_nothing_else() {
        let dev = [
            ("ttys000", 501),
            ("ttys014", 501),
            ("ttys003", 502), // someone else's
            ("ttys0", 0),     // console, root
            ("ttysf", 0),
            ("ttyp1", 501), // not a pty on this macOS
            ("null", 0),
            ("ttys", 501),
            ("ttys12", 501), // too short to be a pty
        ];
        assert_eq!(
            pick_ttys(dev.iter().copied(), 501),
            vec!["/dev/ttys000".to_string(), "/dev/ttys014".to_string()]
        );
        assert!(pick_ttys(dev.iter().copied(), 999).is_empty());
    }

    #[test]
    fn refuses_paths_that_escape() {
        let s = scratch();
        assert!(install(&s, "x", &files(&[("../etc/passwd", "no")])).is_err());
        assert!(install(&s, "x", &files(&[("/abs", "no")])).is_err());
        assert!(current_name(&s).is_none());
    }
}
