//! The login item is launchd's job, and launchd brings it back after a crash.
//!
//! `tauri-plugin-autostart` writes `~/Library/LaunchAgents/scuttlarr.plist`
//! with `RunAtLoad` only, so a crash leaves the app dead until the next login —
//! and with it every keep-awake hold, which lives in this process. After each
//! registration the plist gains `KeepAlive { SuccessfulExit = false }`: a crash
//! or a kill relaunches, an orderly Quit (exit 0) stays quit (DECISIONS
//! 2026-10-01). launchd reads the file at login or `launchctl bootstrap`, so the
//! change takes effect from the next of those.

use std::path::PathBuf;

/// The job label the autostart plugin registers (the app's product name).
pub const LABEL: &str = "scuttlarr";

const KEEP_ALIVE: &str =
    "  <key>KeepAlive</key>\n  <dict>\n    <key>SuccessfulExit</key>\n    <false/>\n  </dict>\n";

fn plist_path() -> Option<PathBuf> {
    dirs::home_dir().map(|h| {
        h.join("Library/LaunchAgents")
            .join(format!("{LABEL}.plist"))
    })
}

/// Add relaunch-on-crash to the registered plist. Failure is logged, never
/// fatal — the login item still works without it.
pub fn keep_alive_on_crash() {
    let Some(path) = plist_path() else {
        return;
    };
    let Ok(plist) = std::fs::read_to_string(&path) else {
        return;
    };
    if let Some(patched) = with_keep_alive(&plist) {
        if let Err(e) = std::fs::write(&path, patched) {
            eprintln!("[scuttlarr] login item KeepAlive: {e}");
        }
    }
}

/// The plist with `KeepAlive` added before the top-level dict closes; None when
/// it already has one or isn't shaped like a plist. Pure, so it's testable.
fn with_keep_alive(plist: &str) -> Option<String> {
    if plist.contains("<key>KeepAlive</key>") {
        return None;
    }
    let close = plist.rfind("</dict>")?;
    Some(format!(
        "{}{KEEP_ALIVE}{}",
        &plist[..close],
        &plist[close..]
    ))
}

/// Shell for a relaunch from a child that outlives us: start the launchd job
/// when it's loaded, so the new instance is supervised too; `open -g` the
/// bundle (passed as `$0`) when it isn't.
pub fn relaunch_script() -> String {
    format!(
        "sleep 1; /bin/launchctl kickstart \"gui/$(/usr/bin/id -u)/{LABEL}\" 2>/dev/null || /usr/bin/open -g \"$0\""
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    /// What the autostart plugin writes, byte for byte (2026-10-01).
    const PLUGIN_PLIST: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
  <key>Label</key>
  <string>scuttlarr</string>
  <key>ProgramArguments</key>
  <array><string>/Applications/scuttlarr.app/Contents/MacOS/scuttlarr</string></array>
  <key>RunAtLoad</key>
  <true/>
  </dict>
</plist>"#;

    #[test]
    fn adds_keep_alive_inside_the_top_level_dict() {
        let out = with_keep_alive(PLUGIN_PLIST).expect("patched");
        let keep = out.find("<key>KeepAlive</key>").expect("key present");
        assert!(keep > out.find("<key>RunAtLoad</key>").expect("run at load"));
        assert!(keep < out.rfind("</dict>").expect("dict closes"));
        assert!(out.contains("<key>SuccessfulExit</key>\n    <false/>"));
        assert!(out.ends_with("</dict>\n</plist>"));
    }

    #[test]
    fn is_idempotent_and_ignores_garbage() {
        let once = with_keep_alive(PLUGIN_PLIST).expect("patched");
        assert_eq!(with_keep_alive(&once), None);
        assert_eq!(with_keep_alive("not a plist"), None);
    }

    #[test]
    fn plutil_accepts_the_patched_plist() {
        let dir = std::env::temp_dir().join(format!("scuttlarr-login-item-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let file = dir.join("job.plist");
        std::fs::write(&file, with_keep_alive(PLUGIN_PLIST).unwrap()).unwrap();
        let ok = std::process::Command::new("/usr/bin/plutil")
            .arg("-lint")
            .arg(&file)
            .status()
            .unwrap()
            .success();
        let _ = std::fs::remove_dir_all(&dir);
        assert!(ok, "plutil -lint rejected the patched plist");
    }
}
