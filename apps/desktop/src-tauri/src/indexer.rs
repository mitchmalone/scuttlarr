use std::{
    fs,
    path::{Path, PathBuf},
    sync::mpsc,
    time::Duration,
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::settings_panes;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ItemKind {
    App,
    Settings,
    Scuttlarr,
    Link,
    Command,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexItem {
    /// Stable identity: app bundle path, `settings:<pane-id>`, or `scuttlarr:<action>`.
    pub id: String,
    pub name: String,
    pub kind: ItemKind,
    /// What launching opens: bundle path or deep link. Informational for internal items.
    pub path: String,
    /// Dimmed hint column in the results list.
    pub hint: String,
    /// Absolute path to a cached PNG icon, when one exists.
    pub icon: Option<String>,
    /// Curated synonyms the fuzzy matcher may match against (the *alias* role).
    pub aliases: Vec<String>,
    /// Derived search-only hints — bundle id tail, `CFBundleName`, executable — that
    /// only count at a word start (the *keyword* role; `@scuttlarr/core/ranking`).
    /// Absent for anything but apps.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub keywords: Vec<String>,
    /// Links only: open in this browser (`open -a`); None = default.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub browser: Option<String>,
}

const APP_DIRS: &[&str] = &[
    "/Applications",
    "/Applications/Utilities",
    "/System/Applications",
    "/System/Applications/Utilities",
];

pub fn scan(links: &[crate::config::Link], include_bookmarks: bool) -> Vec<IndexItem> {
    let mut items: Vec<IndexItem> = Vec::with_capacity(300);

    let mut dirs: Vec<PathBuf> = APP_DIRS.iter().map(PathBuf::from).collect();
    if let Some(home) = dirs::home_dir() {
        dirs.push(home.join("Applications"));
    }
    for dir in dirs {
        scan_dir(&dir, 0, &mut items);
    }

    // De-dup by path (e.g. /Applications/Utilities is scanned via both its parent and itself).
    items.sort_by(|a, b| a.id.cmp(&b.id));
    items.dedup_by(|a, b| a.id == b.id);

    for (name, pane_id) in settings_panes::SETTINGS_PANES {
        items.push(IndexItem {
            id: format!("settings:{pane_id}"),
            name: (*name).to_string(),
            kind: ItemKind::Settings,
            path: settings_panes::deep_link(pane_id),
            hint: "settings".into(),
            icon: None,
            aliases: vec!["settings".into(), "preferences".into()],
            keywords: Vec::new(),
            browser: None,
        });
    }

    // System commands: sleep displays and friends (see system_commands.rs).
    for cmd in crate::system_commands::SYSTEM_COMMANDS {
        items.push(IndexItem {
            id: format!("cmd:{}", cmd.slug),
            name: cmd.name.to_string(),
            kind: ItemKind::Command,
            path: String::new(),
            hint: "command".into(),
            icon: None,
            aliases: cmd.aliases.split(' ').map(String::from).collect(),
            keywords: Vec::new(),
            browser: None,
        });
    }

    // Custom links from config: first-class results that open in the browser.
    for link in links {
        items.push(IndexItem {
            id: format!("link:{}", link.url),
            name: link.name.clone(),
            kind: ItemKind::Link,
            path: link.url.clone(),
            hint: "link".into(),
            icon: None,
            aliases: Vec::new(),
            keywords: Vec::new(),
            browser: link.browser.clone(),
        });
    }

    // Browser bookmarks, strictly opt-in (default off — see DECISIONS 2026-08-09).
    if include_bookmarks {
        for bookmark in crate::bookmarks::collect() {
            items.push(IndexItem {
                id: format!("bookmark:{}", bookmark.url),
                name: bookmark.name,
                kind: ItemKind::Link,
                path: bookmark.url,
                hint: "bookmark".into(),
                icon: None,
                aliases: Vec::new(),
                keywords: Vec::new(),
                browser: None,
            });
        }
        // Bookmarks may repeat across browsers/profiles; ids collide → dedupe again.
        items.sort_by(|a, b| a.id.cmp(&b.id));
        items.dedup_by(|a, b| a.id == b.id);
    }

    // scuttlarr self-indexes (PRD §4.5): the prompt is the preferences UI.
    for (action, name, alias) in [
        (
            "settings",
            "scuttlarr — Settings",
            "settings preferences options",
        ),
        ("reindex", "scuttlarr — Reindex apps", "reindex"),
        (
            "colorpicker",
            "Color Picker",
            "colorpicker color picker eyedropper hex sample",
        ),
        (
            "config",
            "scuttlarr — Open config",
            "config settings preferences",
        ),
        (
            "theme",
            "scuttlarr — Theme switcher",
            "theme themes appearance switcher colors colours",
        ),
        (
            "wallpaper",
            "scuttlarr — Next wallpaper",
            "wallpaper background desktop picture next",
        ),
        ("quit", "scuttlarr — Quit", "quit exit"),
    ] {
        items.push(IndexItem {
            id: format!("scuttlarr:{action}"),
            name: name.into(),
            kind: ItemKind::Scuttlarr,
            path: String::new(),
            hint: "scuttlarr".into(),
            icon: None,
            aliases: alias.split(' ').map(String::from).collect(),
            keywords: Vec::new(),
            browser: None,
        });
    }

    items
}

/// Words that name a technology rather than the app — as a keyword they'd make
/// `elec` find every Electron app. Kept short; the corpus pins the rest.
const GENERIC_KEYWORDS: &[&str] = &[
    "electron",
    "node",
    "java",
    "python",
    "helper",
    "launcher",
    "app",
    "desktop",
    "macos",
    "mac",
    "native",
    "extension",
    "main",
    "utility",
    "client",
    "bootstrapper",
    "macsys",
    "shortcuts",
];

/// The keyword role for an app (`@scuttlarr/core/ranking`, DECISIONS 2026-09-16):
/// the bundle id's tail (`VSCode`), `CFBundleName` (`Code`) and the executable
/// (`Resolve`), each kept only when it says something the display name doesn't —
/// not equal to it, not contained in it, not a generic word, not a number, not a
/// duplicate. Same rule as `packages/core/src/corpus.json`'s generator.
pub fn keywords_for(
    name: &str,
    bundle_id: &str,
    bundle_name: &str,
    executable: &str,
) -> Vec<String> {
    let lname = name.to_lowercase();
    let mut seen: Vec<String> = vec![lname.clone()];
    let mut out = Vec::new();
    let tail = bundle_id.rsplit('.').next().unwrap_or("");
    for candidate in [tail, bundle_name, executable] {
        let k = candidate.trim();
        let lk = k.to_lowercase();
        if k.chars().count() < 3 || k.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        if GENERIC_KEYWORDS.contains(&lk.as_str()) || lname.contains(&lk) {
            continue;
        }
        if seen.contains(&lk) {
            continue;
        }
        seen.push(lk);
        out.push(k.to_string());
    }
    out
}

/// The three plist strings the keyword role is derived from; empty on any failure —
/// a bundle without a readable plist still indexes by its file name.
fn bundle_strings(app: &Path) -> (String, String, String) {
    let Ok(value) = plist::Value::from_file(app.join("Contents/Info.plist")) else {
        return Default::default();
    };
    let Some(dict) = value.as_dictionary() else {
        return Default::default();
    };
    let get = |key: &str| {
        dict.get(key)
            .and_then(|v| v.as_string())
            .unwrap_or("")
            .to_string()
    };
    (
        get("CFBundleIdentifier"),
        get("CFBundleName"),
        get("CFBundleExecutable"),
    )
}

fn scan_dir(dir: &Path, depth: u8, items: &mut Vec<IndexItem>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Some(file_name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if file_name.starts_with('.') {
            continue;
        }
        if file_name.ends_with(".app") {
            let name = file_name.trim_end_matches(".app").to_string();
            let (bundle_id, bundle_name, executable) = bundle_strings(&path);
            let keywords = keywords_for(&name, &bundle_id, &bundle_name, &executable);
            items.push(IndexItem {
                id: path.to_string_lossy().into_owned(),
                name,
                kind: ItemKind::App,
                path: path.to_string_lossy().into_owned(),
                hint: "app".into(),
                icon: None,
                aliases: Vec::new(),
                keywords,
                browser: None,
            });
        } else if depth < 1 && path.is_dir() {
            // One level of vendor folders (Adobe …, Utilities) is enough.
            scan_dir(&path, depth + 1, items);
        }
    }
}

/// Rescan, publish to state, notify the frontend, then top up missing icons.
pub fn refresh(app: &AppHandle) {
    let state = app.state::<crate::AppState>();
    let (links, include_bookmarks) = {
        let cfg = state.config.read().unwrap();
        (cfg.links.clone(), cfg.index_bookmarks)
    };
    let mut items = scan(&links, include_bookmarks);
    crate::icons::annotate_cached(&mut items, &state.icon_dir);
    *state.index.write().unwrap() = items;
    let _ = app.emit("index-updated", ());
    crate::icons::extract_missing(app.clone());
}

/// Initial scan plus an FSEvents watch on the app directories.
pub fn start(app: AppHandle) {
    std::thread::spawn(move || {
        refresh(&app);

        use notify::{RecursiveMode, Watcher};
        let (tx, rx) = mpsc::channel();
        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("[scuttlarr] app watcher failed: {e}");
                return;
            }
        };
        let mut dirs: Vec<PathBuf> = APP_DIRS.iter().map(PathBuf::from).collect();
        if let Some(home) = dirs::home_dir() {
            dirs.push(home.join("Applications"));
        }
        for dir in dirs {
            if dir.exists() {
                // NonRecursive: we only care about .app bundles appearing/disappearing.
                let _ = watcher.watch(&dir, RecursiveMode::NonRecursive);
            }
        }
        loop {
            if rx.recv().is_err() {
                return;
            }
            // Installs write many events; settle before rescanning.
            while rx.recv_timeout(Duration::from_millis(500)).is_ok() {}
            refresh(&app);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keywords_say_only_what_the_name_does_not() {
        assert_eq!(
            keywords_for("Visual Studio Code", "com.microsoft.VSCode", "Code", "Code"),
            vec!["VSCode"] // `Code` is inside the name already
        );
        assert_eq!(
            keywords_for("Calendar", "com.apple.iCal", "Calendar", "Calendar"),
            vec!["iCal"]
        );
        // Equal to or inside the name: nothing new.
        assert!(keywords_for(
            "Google Chrome",
            "com.google.Chrome",
            "Chrome",
            "Google Chrome"
        )
        .is_empty());
        assert!(keywords_for("Ghostty", "com.mitchellh.ghostty", "Ghostty", "ghostty").is_empty());
        // Generic, numeric, short and duplicate candidates are dropped.
        assert!(keywords_for("Figma", "com.figma.Desktop", "Figma", "Figma").is_empty());
        assert!(keywords_for(
            "Screens 5",
            "com.edovia.screens.5",
            "Screens 5",
            "Screens 5"
        )
        .is_empty());
        assert_eq!(
            keywords_for("iTerm", "com.googlecode.iterm2", "iTerm2", "iTerm2"),
            vec!["iterm2"]
        );
        // An unreadable plist indexes by file name alone.
        assert!(keywords_for("Thing", "", "", "").is_empty());
    }

    #[test]
    fn scan_is_inside_the_index_budget_with_keywords() {
        // AGENTS.md: full index rebuild (~300 apps) < 500 ms. The plist read per app is
        // the only new cost; a generous bound so CI noise never fails it.
        let t = std::time::Instant::now();
        let items = scan(&[], false);
        let apps = items.iter().filter(|i| i.kind == ItemKind::App).count();
        let ms = t.elapsed().as_millis();
        assert!(ms < 500, "scan took {ms} ms for {apps} apps");
        assert!(items
            .iter()
            .any(|i| i.kind == ItemKind::App && !i.keywords.is_empty()));
    }

    #[test]
    fn scan_finds_apps_and_settings_and_self() {
        let items = scan(&[], false);
        // Any Mac has Safari and Finder-adjacent system apps.
        assert!(items.iter().any(|i| i.kind == ItemKind::App));
        assert!(items
            .iter()
            .any(|i| i.name == "Bluetooth" && i.kind == ItemKind::Settings));
        assert!(items.iter().any(|i| i.id == "scuttlarr:quit"));
    }

    #[test]
    fn scan_has_no_duplicate_ids() {
        let items = scan(&[], false);
        let mut ids: Vec<_> = items.iter().map(|i| &i.id).collect();
        let before = ids.len();
        ids.sort();
        ids.dedup();
        assert_eq!(before, ids.len());
    }
}
