//! The login item is launchd's job, and launchd brings it back after a crash.
//!
//! `tauri-plugin-autostart` writes `~/Library/LaunchAgents/scuttlarr.plist`
//! with `RunAtLoad` only, so a crash leaves the app dead until the next login —
//! and with it every keep-awake hold, which lives in this process. After each
//! registration the plist gains `KeepAlive { SuccessfulExit = false }`: a crash
//! or a kill relaunches, an orderly Quit (exit 0) stays quit (DECISIONS
//! 2026-10-01). It also gains `LANG`: launchd starts jobs with no locale, where
//! `open` gave the app one, and every child we spawn inherits the difference —
//! tmux, for one, escapes tabs in its `-F` output to `_` without it (JOURNAL
//! 2026-10-01). launchd reads the file at login or `launchctl bootstrap`, so
//! changes take effect from the next of those.

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

/// Add relaunch-on-crash and the user's locale to the registered plist.
/// Failure is logged, never fatal — the login item still works without them.
pub fn supervise() {
    let Some(path) = plist_path() else {
        return;
    };
    let Ok(plist) = std::fs::read_to_string(&path) else {
        return;
    };
    if let Some(patched) = patch(&plist, &user_lang()) {
        if let Err(e) = std::fs::write(&path, patched) {
            eprintln!("[scuttlarr] login item plist: {e}");
        }
    }
}

/// `LANG` for the user's region: `AppleLocale` (`en_US@rg=auzzzz`) as a UTF-8
/// POSIX locale, read when the plist is written — never hardcoded.
fn user_lang() -> String {
    std::process::Command::new("/usr/bin/defaults")
        .args(["read", "-g", "AppleLocale"])
        .output()
        .ok()
        .and_then(|o| lang_from_apple_locale(&String::from_utf8_lossy(&o.stdout)))
        .unwrap_or_else(|| "en_US.UTF-8".to_owned())
}

fn lang_from_apple_locale(locale: &str) -> Option<String> {
    let base = locale.trim().split('@').next()?;
    let ok = !base.is_empty() && base.chars().all(|c| c.is_ascii_alphanumeric() || c == '_');
    ok.then(|| format!("{base}.UTF-8"))
}

/// The plist with whichever of `KeepAlive` and `EnvironmentVariables { LANG }`
/// it lacks added before the top-level dict closes; None when it has both or
/// isn't shaped like a plist. Pure, so it's testable.
fn patch(plist: &str, lang: &str) -> Option<String> {
    let mut add = String::new();
    if !plist.contains("<key>KeepAlive</key>") {
        add.push_str(KEEP_ALIVE);
    }
    if !plist.contains("<key>EnvironmentVariables</key>") {
        add.push_str(&format!(
            "  <key>EnvironmentVariables</key>\n  <dict>\n    <key>LANG</key>\n    <string>{lang}</string>\n  </dict>\n"
        ));
    }
    if add.is_empty() {
        return None;
    }
    let close = plist.rfind("</dict>")?;
    Some(format!("{}{add}{}", &plist[..close], &plist[close..]))
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
        let out = patch(PLUGIN_PLIST, "en_US.UTF-8").expect("patched");
        let keep = out.find("<key>KeepAlive</key>").expect("key present");
        assert!(keep > out.find("<key>RunAtLoad</key>").expect("run at load"));
        assert!(keep < out.rfind("</dict>").expect("dict closes"));
        assert!(out.contains("<key>SuccessfulExit</key>\n    <false/>"));
        assert!(out.ends_with("</dict>\n</plist>"));
    }

    #[test]
    fn adds_the_locale_launchd_leaves_out() {
        let out = patch(PLUGIN_PLIST, "en_US.UTF-8").expect("patched");
        assert!(out.contains("<key>LANG</key>\n    <string>en_US.UTF-8</string>"));
        // A plist that already has KeepAlive still gains the locale.
        let keep_only = PLUGIN_PLIST.replace(
            "  </dict>\n</plist>",
            &format!("{KEEP_ALIVE}  </dict>\n</plist>"),
        );
        let out = patch(&keep_only, "en_AU.UTF-8").expect("patched");
        assert_eq!(out.matches("<key>KeepAlive</key>").count(), 1);
        assert!(out.contains("en_AU.UTF-8"));
    }

    #[test]
    fn reads_lang_from_apple_locale() {
        assert_eq!(
            lang_from_apple_locale("en_US@rg=auzzzz\n").as_deref(),
            Some("en_US.UTF-8")
        );
        assert_eq!(
            lang_from_apple_locale("en_AU").as_deref(),
            Some("en_AU.UTF-8")
        );
        assert_eq!(lang_from_apple_locale(""), None);
        assert_eq!(lang_from_apple_locale("bad value; rm"), None);
    }

    #[test]
    fn is_idempotent_and_ignores_garbage() {
        let once = patch(PLUGIN_PLIST, "en_US.UTF-8").expect("patched");
        assert_eq!(patch(&once, "en_US.UTF-8"), None);
        assert_eq!(patch("not a plist", "en_US.UTF-8"), None);
    }

    #[test]
    fn plutil_accepts_the_patched_plist() {
        let dir = std::env::temp_dir().join(format!("scuttlarr-login-item-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let file = dir.join("job.plist");
        std::fs::write(&file, patch(PLUGIN_PLIST, "en_US.UTF-8").unwrap()).unwrap();
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
