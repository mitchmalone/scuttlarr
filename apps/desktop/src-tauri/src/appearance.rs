//! Theme-policy inputs (plan phase 4): what the machine says right now, reported
//! to the panel window as an `appearance-input` event. The policy itself is pure
//! TypeScript (`@scuttlarr/core/appearance`); Rust only watches two files, both
//! readable with no permission:
//!
//! - `~/Library/DoNotDisturb/DB/Assertions.json` — the active macOS Focus mode
//!   (`storeAssertionRecords[].assertionDetails.assertionDetailsModeIdentifier`);
//!   `ModeConfigurations.json` beside it names every configured mode.
//! - `~/Library/Preferences/.GlobalPreferences.plist` — `AppleInterfaceStyle`
//!   is `Dark` or absent. Read through `defaults` (the plist is binary), on
//!   change of the file, never on a timer.

use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FocusMode {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceInputs {
    /// Active Focus mode identifier, or none.
    pub focus_mode: Option<String>,
    pub system_dark: bool,
    /// Every configured Focus (for the settings mapping rows).
    pub modes: Vec<FocusMode>,
}

fn dnd_dir(home: &Path) -> PathBuf {
    home.join("Library/DoNotDisturb/DB")
}

/// The active Focus from the assertions file's text. Pure; tested on fixtures.
pub fn parse_active_focus(json: &str) -> Option<String> {
    let v: Value = serde_json::from_str(json).ok()?;
    v.get("data")?
        .as_array()?
        .iter()
        .filter_map(|d| d.get("storeAssertionRecords")?.as_array())
        .flatten()
        .filter_map(|r| {
            r.get("assertionDetails")?
                .get("assertionDetailsModeIdentifier")?
                .as_str()
                .map(str::to_string)
        })
        .next()
}

/// Every configured mode (id, display name), sorted by name. Pure.
pub fn parse_modes(json: &str) -> Vec<FocusMode> {
    let Ok(v) = serde_json::from_str::<Value>(json) else {
        return Vec::new();
    };
    let mut out: Vec<FocusMode> = v
        .get("data")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|d| d.get("modeConfigurations")?.as_object())
        .flatten()
        .filter_map(|(id, cfg)| {
            let name = cfg.get("mode")?.get("name")?.as_str()?;
            Some(FocusMode {
                id: id.clone(),
                name: name.to_string(),
            })
        })
        .collect();
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}

pub fn active_focus(home: &Path) -> Option<String> {
    let text = std::fs::read_to_string(dnd_dir(home).join("Assertions.json")).ok()?;
    parse_active_focus(&text)
}

pub fn focus_modes(home: &Path) -> Vec<FocusMode> {
    std::fs::read_to_string(dnd_dir(home).join("ModeConfigurations.json"))
        .map(|t| parse_modes(&t))
        .unwrap_or_default()
}

/// `defaults read -g AppleInterfaceStyle` → "Dark" when dark; the key is absent in light.
pub fn system_dark() -> bool {
    std::process::Command::new("defaults")
        .args(["read", "-g", "AppleInterfaceStyle"])
        .output()
        .map(|o| o.status.success() && String::from_utf8_lossy(&o.stdout).trim() == "Dark")
        .unwrap_or(false)
}

fn home() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("/tmp"))
}

pub fn inputs() -> AppearanceInputs {
    let home = home();
    AppearanceInputs {
        focus_mode: active_focus(&home),
        system_dark: system_dark(),
        modes: focus_modes(&home),
    }
}

/// Watch both directories; on any change re-read and emit if something moved.
pub fn watch(app: AppHandle) {
    std::thread::spawn(move || {
        use notify::{RecursiveMode, Watcher};
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("[scuttlarr appearance] watcher failed: {e}");
                return;
            }
        };
        let home = home();
        for dir in [dnd_dir(&home), home.join("Library/Preferences")] {
            if let Err(e) = watcher.watch(&dir, RecursiveMode::NonRecursive) {
                eprintln!("[scuttlarr appearance] watch {} failed: {e}", dir.display());
            }
        }
        let mut last = inputs();
        loop {
            if rx.recv().is_err() {
                return;
            }
            // Preferences/ is chatty; coalesce a burst, then look once.
            while rx
                .recv_timeout(std::time::Duration::from_millis(250))
                .is_ok()
            {}
            let now = inputs();
            if now.focus_mode != last.focus_mode || now.system_dark != last.system_dark {
                eprintln!(
                    "[scuttlarr appearance] focus={:?} dark={}",
                    now.focus_mode, now.system_dark
                );
                let _ = app.emit("appearance-input", &now);
            }
            last = now;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn active_focus_from_assertions() {
        let json = r#"{"data":[{"storeAssertionRecords":[{"assertionDetails":{"assertionDetailsModeIdentifier":"com.apple.focus.work"}}]}]}"#;
        assert_eq!(
            parse_active_focus(json).as_deref(),
            Some("com.apple.focus.work")
        );
        assert_eq!(
            parse_active_focus(r#"{"data":[{"storeAssertionRecords":[]}]}"#),
            None
        );
        assert_eq!(parse_active_focus("not json"), None);
    }

    #[test]
    fn modes_from_configurations_sorted_by_name() {
        let json = r#"{"data":[{"modeConfigurations":{
            "com.apple.focus.work":{"mode":{"name":"Work","modeIdentifier":"com.apple.focus.work"}},
            "com.apple.donotdisturb.mode.default":{"mode":{"name":"Do Not Disturb"}},
            "junk":{"mode":{}}
        }}]}"#;
        let modes = parse_modes(json);
        assert_eq!(modes.len(), 2);
        assert_eq!(modes[0].name, "Do Not Disturb");
        assert_eq!(modes[1].id, "com.apple.focus.work");
        assert!(parse_modes("{}").is_empty());
    }
}
