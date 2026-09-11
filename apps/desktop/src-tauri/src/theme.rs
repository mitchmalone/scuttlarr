//! Theme apply: the Omarchy mechanism on macOS (DECISIONS 2026-09-11).
//!
//! TypeScript renders (`@scuttlarr/theme`, pure); Rust receives finished bytes
//! and makes them true on disk, then tells the running world:
//!
//! 1. stage every rendered file under `<state>/next-theme/`, `rm -rf` the old
//!    `<state>/current/theme/`, rename the stage into place (one atomic move —
//!    a reader never sees a half-written theme), write `theme.name`;
//! 2. fan out reloads, each independent and fail-visible: OSC colour sequences
//!    into every tmux pane + SIGWINCH (running shells retint, no terminal
//!    reload needed), macOS appearance for the theme's mode, wallpaper, then
//!    the user's `~/.config/scuttlarr/hooks/theme-set.d/*` with the name.
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
    /// Terminal OSC sequences (10/11/12/17/19/4;n) for running panes; empty → skip.
    #[serde(default)]
    pub osc: String,
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

/// Write the OSC payload to every tmux pane's tty, then nudge each pane's
/// foreground process group with SIGWINCH so full-screen apps repaint.
fn retint_tmux(osc: &str) -> Result<usize, String> {
    let Some(list) = tmux(&["list-panes", "-a", "-F", "#{pane_tty}"]) else {
        return Ok(0); // no server — nothing to retint, not a failure
    };
    let mut ttys: Vec<&str> = list
        .lines()
        .map(str::trim)
        .filter(|t| t.starts_with("/dev/"))
        .collect();
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
    if let Some(clients) = tmux(&["list-clients", "-F", "#{client_name}"]) {
        for c in clients.lines().filter(|l| !l.trim().is_empty()) {
            let _ = tmux(&["refresh-client", "-t", c.trim()]);
        }
    }
    Ok(written)
}

fn osascript(script: &str) -> Result<(), String> {
    let out = std::process::Command::new("osascript")
        .args(["-e", script])
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
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
    if !req.osc.is_empty() {
        match retint_tmux(&req.osc) {
            Ok(n) => res.reloaded.push(format!("tmux ({n} panes)")),
            Err(e) => res.failed.push(("tmux".into(), e)),
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
    for (what, why) in &res.failed {
        eprintln!("[scuttlarr theme] {what}: {why}");
    }
    Ok(res)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch() -> PathBuf {
        let d = std::env::temp_dir().join(format!(
            "scuttlarr-theme-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
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
    fn refuses_paths_that_escape() {
        let s = scratch();
        assert!(install(&s, "x", &files(&[("../etc/passwd", "no")])).is_err());
        assert!(install(&s, "x", &files(&[("/abs", "no")])).is_err());
        assert!(current_name(&s).is_none());
    }
}
