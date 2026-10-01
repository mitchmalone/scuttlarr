//! macOS sleep switched off outright while a keep-awake hold is armed.
//!
//! Assertions cover idle sleep and, on AC, lid close. They can't cover lid close
//! on battery, and they die with the process, leaving a gap until the login
//! item relaunches a crash. `pmset -a disablesleep 1` covers both — and is root.
//! scuttlarr never asks for a password: it runs `sudo -n`, which only succeeds
//! when a sudoers rule allows exactly that command without one (installed once
//! by `scuttlarr sudoers on`, DECISIONS 2026-10-01). No rule, no override: the
//! attempt fails quietly and the hold runs on assertions alone.
//!
//! Ownership is a marker file beside `awake.json`: written when we switch sleep
//! off, removed when we switch it back on. Sleep that someone else disabled
//! (Amphetamine, a hand-typed `pmset`) is never ours to re-enable. A crash keeps
//! the override (the point — the Mac stays up until relaunch resumes the hold);
//! an orderly quit, a release, or a launch with nothing to resume clears it.

use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

const PMSET: &str = "/usr/bin/pmset";

/// Serialises reconciles, so an arm and a quick release can't interleave.
static LOCK: Mutex<()> = Mutex::new(());
/// Whether sleep is currently off on our account — the panel's line.
static ENGAGED: AtomicBool = AtomicBool::new(false);

fn marker(dir: &Path) -> PathBuf {
    dir.join("sleep-override")
}

/// Is sleep off on our account right now?
pub fn engaged() -> bool {
    ENGAGED.load(Ordering::Relaxed)
}

/// Bring the override in line with `want` (a hold is armed), off the caller's
/// thread — `sudo` + `pmset` cost tens of milliseconds, and arm sits on the
/// Enter-to-dismiss path.
pub fn reconcile_soon(dir: PathBuf, want: impl Fn() -> bool + Send + 'static) {
    std::thread::spawn(move || reconcile(&dir, want()));
}

/// The synchronous form, for quit: there is no later.
pub fn reconcile(dir: &Path, want: bool) {
    let Ok(_guard) = LOCK.lock() else {
        return;
    };
    let ours = marker(dir).exists();
    match (want, ours) {
        (true, false) => {
            if sleep_disabled() == Some(true) {
                // Someone else's override: it already holds, and isn't ours to end.
                return;
            }
            if run(true) {
                let _ = std::fs::create_dir_all(dir);
                let _ = std::fs::write(marker(dir), b"");
                ENGAGED.store(true, Ordering::Relaxed);
                crate::logbook::breadcrumb("awake", "macOS sleep switched off");
            }
        }
        (false, true) => {
            if run(false) {
                let _ = std::fs::remove_file(marker(dir));
                ENGAGED.store(false, Ordering::Relaxed);
                crate::logbook::breadcrumb("awake", "macOS sleep switched back on");
            }
        }
        (true, true) => ENGAGED.store(true, Ordering::Relaxed),
        (false, false) => ENGAGED.store(false, Ordering::Relaxed),
    }
}

/// `sudo -n pmset -a disablesleep 0|1`; false without a passwordless rule.
#[cfg(not(test))]
fn run(off: bool) -> bool {
    use std::process::Stdio;
    Command::new("/usr/bin/sudo")
        .args([
            "-n",
            PMSET,
            "-a",
            "disablesleep",
            if off { "1" } else { "0" },
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok_and(|s| s.success())
}

/// Tests arm real sessions; they must never switch the developer's sleep off.
#[cfg(test)]
fn run(_off: bool) -> bool {
    false
}

/// `SleepDisabled` from `pmset -g`; None when it can't be read.
fn sleep_disabled() -> Option<bool> {
    let out = Command::new(PMSET).arg("-g").output().ok()?;
    parse_sleep_disabled(&String::from_utf8_lossy(&out.stdout))
}

fn parse_sleep_disabled(out: &str) -> Option<bool> {
    out.lines().find_map(|line| {
        let mut words = line.split_whitespace();
        (words.next()? == "SleepDisabled").then(|| words.next() == Some("1"))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_sleep_disabled_from_pmset() {
        let on = "System-wide power settings:\n SleepDisabled\t\t1\nCurrently in use:\n sleep 1\n";
        assert_eq!(parse_sleep_disabled(on), Some(true));
        let off = "System-wide power settings:\n SleepDisabled\t\t0\n";
        assert_eq!(parse_sleep_disabled(off), Some(false));
        assert_eq!(parse_sleep_disabled("Currently in use:\n sleep 1\n"), None);
    }

    #[test]
    fn nothing_to_undo_without_the_marker() {
        // No marker, nothing wanted: no command runs, nothing engaged.
        let dir = std::env::temp_dir().join(format!("scuttlarr-override-{}", std::process::id()));
        reconcile(&dir, false);
        assert!(!engaged());
        assert!(!marker(&dir).exists());
    }
}
