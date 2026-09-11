//! User themes: `~/.config/scuttlarr/themes/<name>/` (plan 3.6; DECISIONS 2026-09-11,
//! theme format). A directory is a theme when it holds `colors.toml`; a same-named
//! directory overrides the built-in (one file, so the override is whole). Paid
//! themes live here and never in the repo. `theme install <git-url>` clones into it
//! with Omarchy's naming rules and its security filter: a cloned theme contributes
//! only `colors.toml` and known hand files — never symlinks, never scripts.
//!
//! Rust reads bytes and runs git; parsing and rendering stay in `@scuttlarr/theme`.

use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::error::{CmdError, CmdResult};

/// Hand-written files a theme directory may ship beside `colors.toml`; anything
/// else in a cloned theme is ignored (an installed theme is someone else's code).
pub const HAND_FILES: [&str; 8] = [
    "ghostty",
    "tmux.conf",
    "p10k-colors.zsh",
    "delta.gitconfig",
    "claude.json",
    "neovim.lua",
    "vscode-theme.json",
    "btop.theme",
];

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserTheme {
    pub name: String,
    /// `colors.toml`, verbatim.
    pub text: String,
    /// Hand files present, name → contents.
    pub hand_files: std::collections::BTreeMap<String, String>,
    /// Came from `theme install` (has a `.git`), so `theme update` can pull it.
    pub installed: bool,
    pub dir: String,
    /// `backgrounds/*.{jpg,jpeg,png,heic,webp}`, absolute, sorted — the wallpapers
    /// `theme apply` cycles through (Omarchy's model).
    pub backgrounds: Vec<String>,
}

const IMAGE_EXTENSIONS: [&str; 5] = ["jpg", "jpeg", "png", "heic", "webp"];

pub fn backgrounds_in(dir: &Path) -> Vec<String> {
    let Ok(entries) = std::fs::read_dir(dir.join("backgrounds")) else {
        return Vec::new();
    };
    let mut out: Vec<String> = entries
        .flatten()
        .map(|e| e.path())
        .filter(|p| {
            std::fs::symlink_metadata(p)
                .map(|m| m.is_file())
                .unwrap_or(false)
        })
        .filter(|p| {
            p.extension()
                .and_then(|e| e.to_str())
                .map(|e| IMAGE_EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()))
                .unwrap_or(false)
        })
        .map(|p| p.display().to_string())
        .collect();
    out.sort();
    out
}

pub fn themes_dir(config_dir: &Path) -> PathBuf {
    config_dir.join("themes")
}

/// Omarchy's rule: `^[a-z0-9_][a-z0-9._+-]*$`, from the repo basename with `.git`,
/// a leading `omarchy-`/`scuttlarr-` and a trailing `-theme` stripped.
pub fn name_from_url(url: &str) -> Option<String> {
    let base = url
        .trim_end_matches('/')
        .rsplit(['/', ':'])
        .next()?
        .trim_end_matches(".git")
        .to_ascii_lowercase();
    let name = base
        .strip_prefix("omarchy-")
        .or_else(|| base.strip_prefix("scuttlarr-"))
        .unwrap_or(&base);
    let name = name.strip_suffix("-theme").unwrap_or(name);
    valid_name(name).then(|| name.to_string())
}

pub fn valid_name(name: &str) -> bool {
    let mut chars = name.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    (first.is_ascii_lowercase() || first.is_ascii_digit() || first == '_')
        && chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || "._+-".contains(c))
}

/// Read one theme directory. `None` if it has no `colors.toml`.
pub fn read_theme(dir: &Path) -> Option<UserTheme> {
    let name = dir.file_name()?.to_str()?.to_string();
    if !valid_name(&name) {
        return None;
    }
    let colors = dir.join("colors.toml");
    // A symlinked colors.toml in an installed theme could point anywhere; only trust regular files.
    let meta = std::fs::symlink_metadata(&colors).ok()?;
    if !meta.is_file() {
        return None;
    }
    let text = std::fs::read_to_string(&colors).ok()?;
    let mut hand_files = std::collections::BTreeMap::new();
    for file in HAND_FILES {
        let p = dir.join(file);
        if std::fs::symlink_metadata(&p)
            .map(|m| m.is_file())
            .unwrap_or(false)
        {
            if let Ok(body) = std::fs::read_to_string(&p) {
                hand_files.insert(file.to_string(), body);
            }
        }
    }
    Some(UserTheme {
        name,
        text,
        hand_files,
        installed: dir.join(".git").exists(),
        dir: dir.display().to_string(),
        backgrounds: backgrounds_in(dir),
    })
}

pub fn list(config_dir: &Path) -> Vec<UserTheme> {
    let Ok(entries) = std::fs::read_dir(themes_dir(config_dir)) else {
        return Vec::new();
    };
    let mut out: Vec<UserTheme> = entries
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.is_dir())
        .filter_map(|p| read_theme(&p))
        .collect();
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}

/// `git clone` into the themes dir. Replaces an existing directory of the same
/// name only if it was itself installed (has `.git`); a hand-made theme is never
/// clobbered by an install.
pub fn install(config_dir: &Path, url: &str) -> CmdResult<UserTheme> {
    let url = url.trim();
    if !(url.starts_with("https://") || url.starts_with("git@") || url.starts_with("ssh://")) {
        return Err(CmdError::Internal(format!("not a git URL: {url}")));
    }
    let name = name_from_url(url)
        .ok_or_else(|| CmdError::Internal(format!("can't derive a theme name from {url}")))?;
    let dest = themes_dir(config_dir).join(&name);
    if dest.exists() {
        if dest.join(".git").exists() {
            std::fs::remove_dir_all(&dest)?;
        } else {
            return Err(CmdError::Internal(format!(
                "a hand-made theme named {name} already exists at {}",
                dest.display()
            )));
        }
    }
    std::fs::create_dir_all(themes_dir(config_dir))?;
    let out = std::process::Command::new("git")
        .args(["clone", "--depth", "1", "--", url])
        .arg(&dest)
        .output()?;
    if !out.status.success() {
        return Err(CmdError::Internal(format!(
            "git clone failed: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        )));
    }
    read_theme(&dest).ok_or_else(|| {
        let _ = std::fs::remove_dir_all(&dest);
        CmdError::Internal(format!(
            "{url} has no colors.toml at its root — not a theme"
        ))
    })
}

/// `git pull` every installed theme; returns the names that changed.
pub fn update(config_dir: &Path) -> Vec<String> {
    list(config_dir)
        .into_iter()
        .filter(|t| t.installed)
        .filter(|t| {
            std::process::Command::new("git")
                .args(["-C", &t.dir, "pull", "--ff-only", "-q"])
                .output()
                .map(|o| {
                    o.status.success()
                        && !String::from_utf8_lossy(&o.stdout).contains("Already up to date")
                })
                .unwrap_or(false)
        })
        .map(|t| t.name)
        .collect()
}

pub fn remove(config_dir: &Path, name: &str) -> CmdResult<()> {
    if !valid_name(name) {
        return Err(CmdError::Internal(format!("not a theme name: {name}")));
    }
    let dir = themes_dir(config_dir).join(name);
    if !dir.is_dir() {
        return Err(CmdError::NotFound(format!("theme {name}")));
    }
    std::fs::remove_dir_all(&dir)?;
    Ok(())
}

/// Watch the themes dir; a change (a file saved, a clone landing) tells every
/// window to re-list. Same shape as the config watcher.
pub fn watch(app: AppHandle) {
    std::thread::spawn(move || {
        use notify::{RecursiveMode, Watcher};
        let dir = themes_dir(&crate::config::config_dir());
        let _ = std::fs::create_dir_all(&dir);
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("[scuttlarr themes] watcher failed: {e}");
                return;
            }
        };
        if let Err(e) = watcher.watch(&dir, RecursiveMode::Recursive) {
            eprintln!("[scuttlarr themes] watch failed: {e}");
            return;
        }
        loop {
            if rx.recv().is_err() {
                return;
            }
            while rx
                .recv_timeout(std::time::Duration::from_millis(300))
                .is_ok()
            {}
            let _ = app.emit("user-themes-changed", ());
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch() -> PathBuf {
        let d = std::env::temp_dir().join(format!(
            "scuttlarr-user-themes-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn names_follow_omarchy_rules() {
        assert_eq!(
            name_from_url("https://github.com/x/omarchy-catppuccin-latte-theme.git").as_deref(),
            Some("catppuccin-latte")
        );
        assert_eq!(
            name_from_url("git@github.com:me/scuttlarr-dracula-pro.git").as_deref(),
            Some("dracula-pro")
        );
        assert_eq!(name_from_url("https://x/Bad Name").as_deref(), None);
        assert!(valid_name("rose-pine"));
        assert!(!valid_name("-leading"));
        assert!(!valid_name("../escape"));
    }

    #[test]
    fn lists_only_dirs_with_a_real_colors_toml_and_known_hand_files() {
        let cfg = scratch();
        let t = themes_dir(&cfg);
        std::fs::create_dir_all(t.join("dracula-pro")).unwrap();
        std::fs::write(t.join("dracula-pro/colors.toml"), "mode = \"dark\"\n").unwrap();
        std::fs::write(t.join("dracula-pro/ghostty"), "# hand\n").unwrap();
        std::fs::write(t.join("dracula-pro/evil.sh"), "rm -rf /\n").unwrap();
        std::fs::create_dir_all(t.join("notatheme")).unwrap();
        std::fs::create_dir_all(t.join("linked")).unwrap();
        std::os::unix::fs::symlink(
            t.join("dracula-pro/colors.toml"),
            t.join("linked/colors.toml"),
        )
        .unwrap();

        let themes = list(&cfg);
        assert_eq!(themes.len(), 1, "{themes:?}");
        let th = &themes[0];
        assert_eq!(th.name, "dracula-pro");
        assert_eq!(th.text, "mode = \"dark\"\n");
        assert_eq!(th.hand_files.keys().collect::<Vec<_>>(), vec!["ghostty"]);
        assert!(!th.installed);
        assert!(th.backgrounds.is_empty());
    }

    #[test]
    fn backgrounds_are_images_only_sorted_absolute() {
        let cfg = scratch();
        let d = themes_dir(&cfg).join("t");
        std::fs::create_dir_all(d.join("backgrounds")).unwrap();
        std::fs::write(d.join("colors.toml"), "").unwrap();
        for f in ["b.png", "a.JPG", "notes.txt"] {
            std::fs::write(d.join("backgrounds").join(f), "x").unwrap();
        }
        let bg = backgrounds_in(&d);
        assert_eq!(bg.len(), 2, "{bg:?}");
        assert!(bg[0].ends_with("/a.JPG") && bg[1].ends_with("/b.png"));
    }

    #[test]
    fn remove_refuses_bad_names_and_missing_themes() {
        let cfg = scratch();
        assert!(remove(&cfg, "../x").is_err());
        assert!(matches!(remove(&cfg, "nope"), Err(CmdError::NotFound(_))));
        std::fs::create_dir_all(themes_dir(&cfg).join("gone")).unwrap();
        remove(&cfg, "gone").unwrap();
        assert!(!themes_dir(&cfg).join("gone").exists());
    }

    #[test]
    fn install_rejects_non_git_urls_and_hand_made_collisions() {
        let cfg = scratch();
        assert!(install(&cfg, "ftp://nope").is_err());
        std::fs::create_dir_all(themes_dir(&cfg).join("mine")).unwrap();
        let err = install(&cfg, "https://github.com/x/mine.git").unwrap_err();
        assert!(err.to_string().contains("hand-made"), "{err}");
    }
}
