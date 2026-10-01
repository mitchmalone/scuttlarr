//! Away mode: while an `awake` hold has it ticked, this Mac's only display is a
//! BetterDisplay virtual screen shaped like the iPad, so a Screens session fills
//! the iPad instead of letterboxing a 5K desktop (DECISIONS 2026-10-01).
//!
//! Screens streams whatever framebuffers exist and can't resize them, and a
//! virtual display needs private CoreGraphics API — BetterDisplay already owns
//! that, and ships a CLI inside its binary. This module only drives that CLI:
//! create the screen once, connect it, pick its mode by name (mode numbers shift
//! between connects), and re-check every minute while held. `system_profiler`
//! is the truth for what macOS shows; BetterDisplay's own `get -connected` is
//! ambiguous (JOURNAL 2026-10-01).
//!
//! Off means off: no thread, no process, no read until a hold asks for it.

use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::time::Duration;

use serde::Serialize;

const BETTERDISPLAY_APP: &str = "/Applications/BetterDisplay.app";
const BETTERDISPLAY: &str = "/Applications/BetterDisplay.app/Contents/MacOS/BetterDisplay";
/// The virtual screen's name, as macOS and BetterDisplay both report it.
pub const SCREEN: &str = "iPad";
/// A 13-inch iPad: 4:3, 1366x1024 points on a 2732x2048 backing.
const MODE: &str = "1366x1024 HiDPI";
const BACKING: &str = "2732 x 2048";
const RESOLUTIONS: &str = "1366x1024,1194x896,1024x768,1194x834";
const CHECK_EVERY: Duration = Duration::from_secs(60);

/// Bumped on every start/stop; a check loop exits once it no longer matches.
static GENERATION: AtomicU64 = AtomicU64::new(0);
static RUNNING: AtomicBool = AtomicBool::new(false);

/// What the panel needs to say whether away mode will work.
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AwayReading {
    /// BetterDisplay is installed.
    pub installed: bool,
    /// The iPad screen is connected at its mode right now.
    pub screen_ready: bool,
    /// Every other display macOS shows — Screens would show these too.
    pub others: Vec<String>,
}

/// Hold the iPad screen, re-checking every minute until `end` or `stop`.
pub fn start() {
    let gen = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    RUNNING.store(true, Ordering::SeqCst);
    std::thread::spawn(move || loop {
        if let Err(why) = ensure() {
            crate::logbook::breadcrumb("away", &format!("screen not ready: {why}"));
        }
        let mut waited = Duration::ZERO;
        while waited < CHECK_EVERY {
            if GENERATION.load(Ordering::SeqCst) != gen {
                return;
            }
            std::thread::sleep(Duration::from_secs(1));
            waited += Duration::from_secs(1);
        }
    });
}

/// Stop holding, leaving the screen as it is — an orderly quit, where the next
/// launch resumes the hold and picks it up again.
pub fn stop() {
    GENERATION.fetch_add(1, Ordering::SeqCst);
    RUNNING.store(false, Ordering::SeqCst);
}

/// The hold ended: stop, and hand the desk back — disconnect the iPad screen,
/// but only when a real display is there to take over (with none, macOS falls
/// back to a 1080p placeholder, which is worse). No-op when away wasn't on.
pub fn end() {
    if !RUNNING.swap(false, Ordering::SeqCst) {
        return;
    }
    GENERATION.fetch_add(1, Ordering::SeqCst);
    std::thread::spawn(|| {
        let shown = displays();
        if shown.iter().any(|d| d.name == SCREEN) && !others(&shown).is_empty() {
            betterdisplay(&["set", &format!("-name={SCREEN}"), "-connected=off"]);
            crate::logbook::breadcrumb("away", "ended: iPad screen disconnected");
        }
    });
}

/// One reading for the panel. Spawns `system_profiler` (~0.3 s): panel open only.
pub fn reading() -> AwayReading {
    let installed = std::path::Path::new(BETTERDISPLAY).exists();
    let shown = displays();
    AwayReading {
        installed,
        screen_ready: screen_ready(&shown),
        others: others(&shown),
    }
}

/// Make the iPad screen exist, be connected, and sit at its mode.
fn ensure() -> Result<(), &'static str> {
    if !std::path::Path::new(BETTERDISPLAY).exists() {
        return Err("BetterDisplay isn't installed");
    }
    if !process_running("BetterDisplay") {
        let _ = Command::new("/usr/bin/open")
            .args(["-ga", BETTERDISPLAY_APP])
            .status();
        std::thread::sleep(Duration::from_secs(5));
    }
    if screen_ready(&displays()) {
        return Ok(());
    }
    let ids = betterdisplay(&["get", "-identifiers"]).unwrap_or_default();
    if !has_screen(&ids) {
        betterdisplay(&[
            "create",
            "-type=VirtualScreen",
            &format!("-virtualScreenName={SCREEN}"),
            "-aspectWidth=4",
            "-aspectHeight=3",
            "-virtualScreenHiDPI=on",
            "-useResolutionList=on",
            &format!("-resolutionList={RESOLUTIONS}"),
            "-connected=off",
        ]);
        crate::logbook::breadcrumb("away", "created the iPad virtual screen");
        std::thread::sleep(Duration::from_secs(2));
    }
    if !displays().iter().any(|d| d.name == SCREEN) {
        betterdisplay(&["set", &format!("-name={SCREEN}"), "-connected=on"]);
        crate::logbook::breadcrumb("away", "connected the iPad screen");
        std::thread::sleep(Duration::from_secs(5));
    }
    if !screen_ready(&displays()) {
        let modes = betterdisplay(&["get", &format!("-name={SCREEN}"), "-displayModeList"])
            .unwrap_or_default();
        let n = mode_number(&modes, MODE).ok_or("no 1366x1024 HiDPI mode")?;
        betterdisplay(&[
            "set",
            &format!("-name={SCREEN}"),
            &format!("-displayModeNumber={n}"),
        ]);
        crate::logbook::breadcrumb("away", &format!("set the iPad screen to mode {n}"));
        std::thread::sleep(Duration::from_secs(3));
    }
    if screen_ready(&displays()) {
        Ok(())
    } else {
        Err("still not at 1366x1024 HiDPI")
    }
}

fn betterdisplay(args: &[&str]) -> Option<String> {
    let out = Command::new(BETTERDISPLAY)
        .args(args)
        .stdin(Stdio::null())
        .output()
        .ok()?;
    Some(String::from_utf8_lossy(&out.stdout).into_owned())
}

fn process_running(name: &str) -> bool {
    Command::new("/usr/bin/pgrep")
        .args(["-xq", name])
        .status()
        .is_ok_and(|s| s.success())
}

#[derive(Debug, Clone, PartialEq)]
struct Shown {
    name: String,
    pixels: String,
}

fn displays() -> Vec<Shown> {
    Command::new("/usr/sbin/system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output()
        .ok()
        .map(|o| parse_displays(&String::from_utf8_lossy(&o.stdout)))
        .unwrap_or_default()
}

/// `system_profiler SPDisplaysDataType -json` → every display macOS shows.
fn parse_displays(json: &str) -> Vec<Shown> {
    let Ok(v) = serde_json::from_str::<serde_json::Value>(json) else {
        return Vec::new();
    };
    let gpus = v["SPDisplaysDataType"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    gpus.iter()
        .flat_map(|g| {
            g["spdisplays_ndrvs"]
                .as_array()
                .cloned()
                .unwrap_or_default()
        })
        .filter_map(|d| {
            Some(Shown {
                name: d["_name"].as_str()?.to_owned(),
                pixels: d["_spdisplays_pixels"]
                    .as_str()
                    .unwrap_or_default()
                    .to_owned(),
            })
        })
        .collect()
}

fn screen_ready(shown: &[Shown]) -> bool {
    shown
        .iter()
        .any(|d| d.name == SCREEN && d.pixels == BACKING)
}

/// Displays other than ours and macOS's no-display placeholder.
fn others(shown: &[Shown]) -> Vec<String> {
    shown
        .iter()
        .map(|d| d.name.clone())
        .filter(|n| n != SCREEN && n != "Display" && !n.starts_with("Generic"))
        .collect()
}

/// `get -identifiers` lists a display named `SCREEN`.
fn has_screen(ids: &str) -> bool {
    ids.contains(&format!("\"name\" : \"{SCREEN}\""))
}

/// `7 - 1194x834 HiDPI 60Hz 8bpc Native` lines → the number of the first
/// whose mode is exactly `mode` (so `1366x1024` never matches `1366x1024 HiDPI`).
fn mode_number(list: &str, mode: &str) -> Option<u32> {
    list.lines().find_map(|line| {
        let (n, rest) = line.split_once(" - ")?;
        let rest = rest.trim_start();
        let after = rest.strip_prefix(mode)?;
        after
            .starts_with(' ')
            .then(|| n.trim().parse().ok())
            .flatten()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Trimmed from this Mac's `system_profiler SPDisplaysDataType -json`,
    /// Studio Display plus the iPad screen (2026-10-01).
    const PROFILE: &str = r#"{"SPDisplaysDataType":[{"_name":"Apple M5 Max","spdisplays_ndrvs":[
        {"_name":"Studio Display","_spdisplays_pixels":"5120 x 2880","spdisplays_main":"spdisplays_yes"},
        {"_name":"iPad","_spdisplays_pixels":"2732 x 2048","_spdisplays_resolution":"1366 x 1024 @ 60.00Hz"}
    ]}]}"#;

    #[test]
    fn reads_what_macos_shows() {
        let shown = parse_displays(PROFILE);
        assert_eq!(shown.len(), 2);
        assert!(screen_ready(&shown));
        assert_eq!(others(&shown), vec!["Studio Display".to_owned()]);
        assert!(parse_displays("not json").is_empty());
    }

    #[test]
    fn the_wrong_mode_is_not_ready_and_placeholders_are_not_displays() {
        let shown = vec![
            Shown {
                name: "iPad".into(),
                pixels: "2388 x 1668".into(),
            },
            Shown {
                name: "Display".into(),
                pixels: "1920 x 1080".into(),
            },
        ];
        assert!(!screen_ready(&shown));
        assert!(others(&shown).is_empty());
    }

    #[test]
    fn picks_the_mode_by_name() {
        let list =
            "0 - 800x558 60Hz 8bpc \n5 - 1024x768 HiDPI 60Hz 8bpc \n6 - 1024x768 60Hz 8bpc \n\
                    12 - 1366x1024 60Hz 8bpc \n13 - 1366x1024 HiDPI 60Hz 8bpc \n";
        assert_eq!(mode_number(list, "1366x1024 HiDPI"), Some(13));
        assert_eq!(mode_number(list, "1024x768 HiDPI"), Some(5));
        assert_eq!(mode_number(list, "1194x834 HiDPI"), None);
    }

    #[test]
    fn finds_the_screen_in_identifiers() {
        assert!(has_screen(
            "{\n  \"name\" : \"iPad\",\n  \"tagID\" : \"4\"\n}"
        ));
        assert!(!has_screen("{\n  \"name\" : \"Studio Display\"\n}"));
    }
}
