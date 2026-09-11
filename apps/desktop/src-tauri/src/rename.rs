//! One-shot migration from the launcharr name to scuttlarr (DECISIONS 2026-09-11).
//!
//! Every path the app owned under the old name moves to its new spot, once, at
//! startup, before anything reads it. Each move is `rename` — atomic on the same
//! volume, a no-op when the new path already exists or the old one doesn't — so a
//! fresh install and an already-migrated home both fall straight through.
//!
//! Paths (old → new), all relative to `$HOME`:
//! - `.config/launcharr` → `.config/scuttlarr` (config, scripts, plugins, hooks,
//!   widgets, triggers). The `.build/` cache inside is purged afterwards: plugin
//!   bundles bind to the host's shared-module global, which was renamed, so they
//!   must rebuild.
//! - `.local/share/launcharr` → `.local/share/scuttlarr` (usage mirrors)
//! - `.local/state/launcharr` → `.local/state/scuttlarr` (agents socket, awake)
//! - `Library/Application Support/com.mitchmalone.launcharr` → `…scuttlarr`
//!   (frecency SQLite, icon + thumb caches)
//! - `Library/LaunchAgents/launcharr.plist` is removed; it pointed at
//!   `/Applications/launcharr.app`, which the cask rename retires. The login item
//!   is re-registered from config on every startup anyway (`apply_launch_at_login`).
//!
//! What is deliberately *not* moved: `~/Library/Logs/launcharr.log` (history, cheap
//! to leave), `.bak-launcharr` backups next to adopted files (they belong to the
//! user), and anything in `~/.claude*/settings.json` — the hook paths there are
//! mended by `hooks::boot` through its existing stale-path repair, which is the
//! manifest rule (AGENTS invariant 11) applied to a file we don't own.

use std::path::{Path, PathBuf};

const OLD: &str = "launcharr";
const NEW: &str = "scuttlarr";
const OLD_BUNDLE: &str = "com.mitchmalone.launcharr";
const NEW_BUNDLE: &str = "com.mitchmalone.scuttlarr";

/// What one run did, for the log. Empty means nothing to do.
pub fn migrate(home: &Path) -> Vec<String> {
    let mut log = Vec::new();
    let pairs: [(PathBuf, PathBuf); 4] = [
        (
            home.join(".config").join(OLD),
            home.join(".config").join(NEW),
        ),
        (
            home.join(".local/share").join(OLD),
            home.join(".local/share").join(NEW),
        ),
        (
            home.join(".local/state").join(OLD),
            home.join(".local/state").join(NEW),
        ),
        (
            home.join("Library/Application Support").join(OLD_BUNDLE),
            home.join("Library/Application Support").join(NEW_BUNDLE),
        ),
    ];
    for (old, new) in &pairs {
        match crate::config::migrate_home(old, new) {
            Ok(true) => log.push(format!("moved {} → {}", old.display(), new.display())),
            Ok(false) => {}
            Err(e) => log.push(format!("could not move {}: {e}", old.display())),
        }
    }
    // Plugin bundles compiled under the old name bind to the old shared global.
    let build = home.join(".config").join(NEW).join(".build");
    if build.is_dir() && log.iter().any(|l| l.contains("/.config/")) {
        match std::fs::remove_dir_all(&build) {
            Ok(()) => log.push("purged plugin build cache (rebuilds on load)".into()),
            Err(e) => log.push(format!("could not purge {}: {e}", build.display())),
        }
    }
    let plist = home
        .join("Library/LaunchAgents")
        .join(format!("{OLD}.plist"));
    if plist.exists() {
        match std::fs::remove_file(&plist) {
            Ok(()) => log.push(format!("removed {}", plist.display())),
            Err(e) => log.push(format!("could not remove {}: {e}", plist.display())),
        }
    }
    log
}

/// Startup entry: run the pure migration against the real home and, if the old
/// LaunchAgent was loaded, ask launchd to forget it (best-effort — the file is
/// already gone, and a stale job for a missing binary is harmless).
pub fn boot() {
    let Some(home) = dirs::home_dir() else { return };
    let log = migrate(&home);
    if log.is_empty() {
        return;
    }
    for line in &log {
        eprintln!("[scuttlarr rename] {line}");
    }
    if log.iter().any(|l| l.contains("LaunchAgents")) {
        let _ = std::process::Command::new("launchctl")
            .args(["remove", OLD])
            .output();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch() -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "scuttlarr-rename-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn fresh_home_is_a_no_op() {
        let home = scratch();
        assert!(migrate(&home).is_empty());
    }

    #[test]
    fn moves_every_owned_dir_and_purges_the_build_cache() {
        let home = scratch();
        for rel in [
            ".config/launcharr/.build/amaran",
            ".config/launcharr/plugins/amaran",
            ".local/share/launcharr/mirrors",
            ".local/state/launcharr",
            "Library/Application Support/com.mitchmalone.launcharr/icons",
            "Library/LaunchAgents",
        ] {
            std::fs::create_dir_all(home.join(rel)).unwrap();
        }
        std::fs::write(home.join(".config/launcharr/config.json"), "{}").unwrap();
        std::fs::write(home.join("Library/LaunchAgents/launcharr.plist"), "x").unwrap();

        let log = migrate(&home);
        assert_eq!(log.len(), 6, "{log:?}");
        assert!(home.join(".config/scuttlarr/config.json").exists());
        assert!(home.join(".config/scuttlarr/plugins/amaran").is_dir());
        assert!(!home.join(".config/scuttlarr/.build").exists());
        assert!(!home.join(".config/launcharr").exists());
        assert!(home.join(".local/share/scuttlarr/mirrors").is_dir());
        assert!(home.join(".local/state/scuttlarr").is_dir());
        assert!(home
            .join("Library/Application Support/com.mitchmalone.scuttlarr/icons")
            .is_dir());
        assert!(!home.join("Library/LaunchAgents/launcharr.plist").exists());

        // Second run: nothing left to do.
        assert!(migrate(&home).is_empty());
    }

    #[test]
    fn never_overwrites_an_existing_new_home() {
        let home = scratch();
        std::fs::create_dir_all(home.join(".config/launcharr")).unwrap();
        std::fs::create_dir_all(home.join(".config/scuttlarr")).unwrap();
        std::fs::write(home.join(".config/launcharr/config.json"), "old").unwrap();
        std::fs::write(home.join(".config/scuttlarr/config.json"), "new").unwrap();
        assert!(migrate(&home).is_empty());
        assert_eq!(
            std::fs::read_to_string(home.join(".config/scuttlarr/config.json")).unwrap(),
            "new"
        );
        assert!(home.join(".config/launcharr/config.json").exists());
    }
}
