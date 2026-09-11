//! The machine rung: the app drives the bundled setup CLI (`packages/setup`,
//! shipped under `Contents/Resources/setup/`) — it never reimplements it.
//! Rust here is a thin, allowlisted runner: pick the verb, spawn `zsh
//! bin/scuttlarr <args>`, hand the text back. The CLI owns the manifest, the
//! defaults snapshot, adopt-never-overwrite (AGENTS invariant 11); the app is
//! one more way to invoke it, next to the terminal.
//!
//! Verbs are an enum, not a string: settings can't be talked into running
//! `remove` (CLI-only, on purpose) or anything with a free-form argument.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{CmdError, CmdResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum SetupVerb {
    /// Read-only: what differs from base ⊕ overlay.
    Doctor,
    /// Plan every macOS default that would change.
    DefaultsPlan,
    /// Apply them (the CLI snapshots first). Settings shows the plan before offering this.
    DefaultsApply,
    /// Put `scuttlarr` on PATH (`~/.local/bin`, manifest-recorded).
    Link,
    Unlink,
    /// Run unrun migrations once.
    Migrate,
    Version,
}

/// The argv each verb maps to. `--yes` where the CLI would otherwise `read -q`
/// (there is no tty behind a settings button).
pub fn argv(verb: SetupVerb) -> &'static [&'static str] {
    match verb {
        SetupVerb::Doctor => &["doctor"],
        SetupVerb::DefaultsPlan => &["defaults"],
        SetupVerb::DefaultsApply => &["defaults", "--apply", "--yes"],
        SetupVerb::Link => &["link"],
        SetupVerb::Unlink => &["unlink"],
        SetupVerb::Migrate => &["migrate"],
        SetupVerb::Version => &["version"],
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupOutput {
    pub ok: bool,
    /// stdout and stderr, interleaved in arrival order as best `Command` allows
    /// (stderr carries the CLI's log lines; stdout its data).
    pub output: String,
    /// Where the CLI ran from — so settings can show it and a user can run it by hand.
    pub base: String,
}

/// Where the CLI lives: the bundle's resources in a build, the source tree
/// under `tauri dev` (resources aren't copied for dev runs of every kind).
pub fn base_dir(resource_dir: Option<PathBuf>) -> Option<PathBuf> {
    let candidates = [
        resource_dir.map(|d| d.join("setup")),
        Some(
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../../../packages/setup")
                .to_path_buf(),
        ),
    ];
    candidates
        .into_iter()
        .flatten()
        .find(|d| d.join("bin/scuttlarr").is_file())
        .map(|d| d.canonicalize().unwrap_or(d))
}

/// Run one verb against `base`, capturing everything. Never interactive.
pub fn run_at(base: &Path, verb: SetupVerb) -> CmdResult<SetupOutput> {
    let out = std::process::Command::new("/bin/zsh")
        .arg(base.join("bin/scuttlarr"))
        .args(argv(verb))
        .env("SCUTTLARR_BASE", base)
        .env("NO_COLOR", "1")
        .env_remove("SCUTTLARR_STATE")
        .env_remove("SCUTTLARR_OVERLAY")
        .output()
        .map_err(|e| CmdError::Internal(format!("setup cli failed to start: {e}")))?;
    let mut output = String::from_utf8_lossy(&out.stderr).into_owned();
    let stdout = String::from_utf8_lossy(&out.stdout);
    if !stdout.trim().is_empty() {
        if !output.is_empty() && !output.ends_with('\n') {
            output.push('\n');
        }
        output.push_str(&stdout);
    }
    Ok(SetupOutput {
        ok: out.status.success(),
        output,
        base: base.display().to_string(),
    })
}

pub fn run(app: &tauri::AppHandle, verb: SetupVerb) -> CmdResult<SetupOutput> {
    use tauri::Manager;
    let base = base_dir(app.path().resource_dir().ok())
        .ok_or_else(|| CmdError::NotFound("setup cli not bundled".into()))?;
    run_at(&base, verb)
}

/// Startup, machine rung on: run migrations once, off the main thread. A
/// failure is a log line, never a blocked launcher.
pub fn boot(app: &tauri::AppHandle, enabled: bool) {
    if !enabled {
        return;
    }
    let app = app.clone();
    std::thread::spawn(move || match run(&app, SetupVerb::Migrate) {
        Ok(o) if o.ok => {
            for line in o.output.lines().filter(|l| !l.trim().is_empty()) {
                eprintln!("[scuttlarr setup] {line}");
            }
        }
        Ok(o) => eprintln!("[scuttlarr setup] migrate failed:\n{}", o.output),
        Err(e) => eprintln!("[scuttlarr setup] {e}"),
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_verb_is_non_interactive() {
        // `defaults --apply` would `read -q` without --yes; a settings button has no tty.
        assert!(argv(SetupVerb::DefaultsApply).contains(&"--yes"));
        assert!(!argv(SetupVerb::DefaultsPlan).contains(&"--apply"));
    }

    #[test]
    fn source_tree_is_the_dev_fallback() {
        let base = base_dir(None).expect("packages/setup in the checkout");
        assert!(base.join("lib/manifest.zsh").is_file());
    }

    #[test]
    fn version_runs_end_to_end_from_the_source_tree() {
        let base = base_dir(None).unwrap();
        let out = run_at(&base, SetupVerb::Version).unwrap();
        assert!(out.ok, "{}", out.output);
        assert!(!out.output.trim().is_empty());
    }

    #[test]
    fn verbs_serialize_kebab_case() {
        assert_eq!(
            serde_json::to_string(&SetupVerb::DefaultsApply).unwrap(),
            "\"defaults-apply\""
        );
        let v: SetupVerb = serde_json::from_str("\"doctor\"").unwrap();
        assert_eq!(v, SetupVerb::Doctor);
    }
}
