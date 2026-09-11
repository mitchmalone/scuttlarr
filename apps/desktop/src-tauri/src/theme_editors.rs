//! Hot editors: retint running editors and tools at theme set, each surface a
//! rendered payload plus one reload step, all best-effort and fail-visible
//! (`ThemeResult`). A tool that isn't installed or running is *skipped*, never
//! failed. Every reload here is one the tool documents (docs/THEMES.md):
//!
//! - VS Code / Cursor: the rendered theme becomes a local extension
//!   (`<ext>/scuttlarr.theme-0.0.1`), registered in `extensions.json` so the
//!   extension host adds it live (VS Code's ExtensionsWatcher); `_watch: true`
//!   on the contribution makes the theme service reload the file on change;
//!   `workbench.colorTheme` in settings.json applies live.
//! - Zed: `~/.config/zed/themes/scuttlarr.json` (Zed watches that dir) and
//!   `"theme"` in settings.json (watched too).
//! - Neovim: every server socket under nvim's run dir gets
//!   `:set background` + `:colorscheme` over `--remote-send`.
//! - Helix: `theme = "…"` in config.toml, then `SIGUSR1` (documented reload).
//! - btop: `themes/scuttlarr.theme` + `color_theme` in btop.conf, then
//!   `SIGUSR2` (its documented config reload).
//!
//! Only the pure parts are tested: JSON/JSONC key set, TOML line rewrite,
//! socket enumeration. Process steps are thin wrappers over `/usr/bin/pgrep`,
//! `/usr/bin/pkill`, and `nvim`.

use std::path::{Path, PathBuf};

use serde_json::{json, Value};

/// One surface's fate, folded into `ThemeResult`.
#[derive(Debug, PartialEq)]
pub enum Outcome {
    Done(String),
    Skipped(String),
    Failed(String),
}

pub const EXTENSION_ID: &str = "scuttlarr.theme";
pub const EXTENSION_VERSION: &str = "0.0.1";
pub const THEME_LABEL: &str = "scuttlarr";
const BACKUP_SUFFIX: &str = ".bak-scuttlarr";

// ---------------------------------------------------------------- pure edits

/// Copy `path` to `<path>.bak-scuttlarr` the first time we touch it.
fn backup_once(path: &Path) -> std::io::Result<()> {
    if !path.exists() {
        return Ok(());
    }
    let mut name = path.as_os_str().to_owned();
    name.push(BACKUP_SUFFIX);
    let bak = PathBuf::from(name);
    if !bak.exists() {
        std::fs::copy(path, bak)?;
    }
    Ok(())
}

/// Set `key` to a string at the top level of a JSON object, preserving every
/// other key and its order. Strict JSON round-trips through serde (pretty, 2
/// spaces); a file serde rejects — comments, trailing commas: settings.json is
/// JSONC — gets a line-level edit that leaves the rest byte-for-byte.
/// Missing or empty → a fresh object with only that key.
pub fn set_string_key(text: &str, key: &str, value: &str) -> Result<String, String> {
    if text.trim().is_empty() {
        return Ok(format!("{{\n  {}: {}\n}}\n", json!(key), json!(value)));
    }
    match serde_json::from_str::<Value>(text) {
        Ok(Value::Object(mut map)) => {
            if let Some(Value::Object(inner)) = map.get_mut(key) {
                // Zed's `"theme": { mode, light, dark }` — retint both halves, keep the mode.
                inner.insert("light".into(), Value::String(value.into()));
                inner.insert("dark".into(), Value::String(value.into()));
            } else {
                map.insert(key.into(), Value::String(value.into()));
            }
            let out =
                serde_json::to_string_pretty(&Value::Object(map)).map_err(|e| e.to_string())?;
            Ok(format!("{out}\n"))
        }
        Ok(_) => Err("top level is not an object".into()),
        Err(_) => set_string_key_jsonc(text, key, value),
    }
}

fn set_string_key_jsonc(text: &str, key: &str, value: &str) -> Result<String, String> {
    let needle = format!("\"{key}\"");
    let mut lines: Vec<String> = text.lines().map(str::to_owned).collect();
    let literal = json!(value).to_string();
    for line in lines.iter_mut() {
        let trimmed = line.trim_start();
        let Some(rest) = trimmed.strip_prefix(&needle) else {
            continue;
        };
        let Some(after_colon) = rest.trim_start().strip_prefix(':') else {
            continue;
        };
        let after_colon = after_colon.trim_start();
        if !after_colon.starts_with('"') {
            return Err(format!(
                "\"{key}\" is not a string in a file with comments — set it by hand"
            ));
        }
        let Some(end) = after_colon[1..].find('"') else {
            return Err(format!("unterminated string at \"{key}\""));
        };
        let tail = &after_colon[end + 2..];
        let head_len = line.len() - after_colon.len();
        let head = &line[..head_len];
        *line = format!("{head}{literal}{tail}");
        return Ok(join_lines(&lines, text));
    }
    let Some(open) = lines.iter().position(|l| l.contains('{')) else {
        return Err("no object to add the key to".into());
    };
    let brace_line = lines[open].clone();
    if let Some(close) = brace_line.find('}') {
        // `{}` on one line: split it open.
        let (before, after) = brace_line.split_at(close);
        let before = before.trim_end().to_owned();
        lines[open] = format!("{before}\n  {}: {literal}\n{after}", json!(key));
    } else {
        lines.insert(open + 1, format!("  {}: {literal},", json!(key)));
    }
    Ok(join_lines(&lines, text))
}

fn join_lines(lines: &[String], original: &str) -> String {
    let mut out = lines.join("\n");
    if original.ends_with('\n') {
        out.push('\n');
    }
    out
}

/// Rewrite `key = …` in a TOML file's root table (before the first `[section]`),
/// preserving everything else; absent → inserted at the top. `value` is written
/// as a quoted string.
pub fn set_toml_root_string(text: &str, key: &str, value: &str) -> String {
    let literal = format!("{key} = \"{}\"", value.replace('"', "\\\""));
    let mut lines: Vec<String> = text.lines().map(str::to_owned).collect();
    for line in lines.iter_mut() {
        let t = line.trim_start();
        if t.starts_with('[') {
            break;
        }
        if let Some(rest) = t.strip_prefix(key) {
            if rest.trim_start().starts_with('=') {
                *line = literal;
                return join_lines(&lines, text) + if text.ends_with('\n') { "" } else { "\n" };
            }
        }
    }
    if text.trim().is_empty() {
        return format!("{literal}\n");
    }
    lines.insert(0, literal);
    let mut out = lines.join("\n");
    out.push('\n');
    out
}

/// Neovim listens at `<run>/<random>/nvim.<pid>.0` (`:h $XDG_RUNTIME_DIR`,
/// `stdpath("run")`; on macOS `<run>` is `$TMPDIR/nvim.<user>`). One socket per
/// running instance.
pub fn nvim_sockets(run_dir: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    let Ok(dirs) = std::fs::read_dir(run_dir) else {
        return out;
    };
    for dir in dirs.flatten().map(|e| e.path()).filter(|p| p.is_dir()) {
        let Ok(entries) = std::fs::read_dir(&dir) else {
            continue;
        };
        for p in entries.flatten().map(|e| e.path()).filter(|p| !p.is_dir()) {
            let name = p.file_name().map(|n| n.to_string_lossy().into_owned());
            if name.is_some_and(|n| n.starts_with("nvim.") && n.ends_with(".0")) {
                out.push(p);
            }
        }
    }
    out.sort();
    out
}

/// Where nvim puts its run dir on this machine: `$XDG_RUNTIME_DIR`, `$TMPDIR`,
/// `/tmp` — each `/nvim.<user>`, deduplicated, existing only.
fn nvim_run_dirs() -> Vec<PathBuf> {
    let user = std::env::var("USER").unwrap_or_else(|_| "unknown".into());
    let mut bases: Vec<PathBuf> = Vec::new();
    for var in ["XDG_RUNTIME_DIR", "TMPDIR"] {
        if let Some(v) = std::env::var_os(var) {
            bases.push(PathBuf::from(v));
        }
    }
    if let Ok(out) = std::process::Command::new("/usr/bin/getconf")
        .arg("DARWIN_USER_TEMP_DIR")
        .output()
    {
        let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if out.status.success() && !s.is_empty() {
            bases.push(PathBuf::from(s));
        }
    }
    bases.push(PathBuf::from("/tmp"));
    let mut dirs: Vec<PathBuf> = bases
        .into_iter()
        .map(|b| b.join(format!("nvim.{user}")))
        .filter(|d| d.is_dir())
        .collect();
    dirs.sort();
    dirs.dedup();
    dirs
}

// ------------------------------------------------------------- process steps

fn running(names: &[&str]) -> Option<String> {
    names.iter().find_map(|n| {
        std::process::Command::new("/usr/bin/pgrep")
            .args(["-x", n])
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|_| (*n).to_owned())
    })
}

/// `pkill -<sig> -x <name>` — only ever called for a signal the tool documents.
fn signal(sig: &str, name: &str) -> Result<(), String> {
    let out = std::process::Command::new("/usr/bin/pkill")
        .args([&format!("-{sig}"), "-x", name])
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(format!(
            "pkill -{sig} {name}: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ))
    }
}

fn edit_file(path: &Path, edit: impl FnOnce(&str) -> Result<String, String>) -> Result<(), String> {
    let current = match std::fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(e) => return Err(format!("{}: {e}", path.display())),
    };
    let next = edit(&current)?;
    if next == current {
        return Ok(());
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("{}: {e}", parent.display()))?;
    }
    backup_once(path).map_err(|e| format!("{}: backup: {e}", path.display()))?;
    std::fs::write(path, next).map_err(|e| format!("{}: {e}", path.display()))
}

fn write_file(path: &Path, body: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("{}: {e}", parent.display()))?;
    }
    std::fs::write(path, body).map_err(|e| format!("{}: {e}", path.display()))
}

// ----------------------------------------------------------------- surfaces

/// A VS Code flavour: where its extensions and user settings live.
pub struct VsCodeFlavour {
    pub label: &'static str,
    /// `~/.vscode` — exists iff the editor has ever run.
    pub home: PathBuf,
    pub settings: PathBuf,
}

pub fn vscode_flavours(home: &Path) -> Vec<VsCodeFlavour> {
    let support = home.join("Library/Application Support");
    vec![
        VsCodeFlavour {
            label: "vs code",
            home: home.join(".vscode"),
            settings: support.join("Code/User/settings.json"),
        },
        VsCodeFlavour {
            label: "cursor",
            home: home.join(".cursor"),
            settings: support.join("Cursor/User/settings.json"),
        },
    ]
}

/// The extension manifest: one theme contribution. `_watch` is the theme
/// service's own flag (colorThemeData.ts: `themeData.watch = theme._watch === true`)
/// that makes it reload the file when it changes on disk.
pub fn extension_manifest(mode: &str) -> String {
    let ui = if mode == "light" { "vs" } else { "vs-dark" };
    let manifest = json!({
        "name": "theme",
        "displayName": "scuttlarr",
        "description": "scuttlarr colour theme — rendered at theme set, do not edit",
        "publisher": "scuttlarr",
        "version": EXTENSION_VERSION,
        "engines": { "vscode": "^1.70.0" },
        "categories": ["Themes"],
        "contributes": {
            "themes": [{
                "label": THEME_LABEL,
                "uiTheme": ui,
                "path": "./themes/scuttlarr.json",
                "_watch": true
            }]
        }
    });
    // infallible: a literal json! value serializes
    serde_json::to_string_pretty(&manifest).unwrap_or_default() + "\n"
}

/// `extensions.json` is an array of installed extensions; VS Code's watcher
/// picks up an entry added by another source and adds it to the running host.
pub fn register_extension(list: &str, ext_dir: &Path) -> Result<String, String> {
    let mut arr = if list.trim().is_empty() {
        Vec::new()
    } else {
        match serde_json::from_str::<Value>(list) {
            Ok(Value::Array(a)) => a,
            Ok(_) => return Err("extensions.json is not an array".into()),
            Err(e) => return Err(format!("extensions.json: {e}")),
        }
    };
    arr.retain(|e| e["identifier"]["id"].as_str() != Some(EXTENSION_ID));
    let fs_path = ext_dir.display().to_string();
    arr.push(json!({
        "identifier": { "id": EXTENSION_ID },
        "version": EXTENSION_VERSION,
        "location": {
            "$mid": 1,
            "fsPath": fs_path,
            "external": format!("file://{fs_path}"),
            "path": fs_path,
            "scheme": "file"
        },
        "relativeLocation": ext_dir.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default()
    }));
    serde_json::to_string(&Value::Array(arr)).map_err(|e| e.to_string())
}

pub fn apply_vscode(flavour: &VsCodeFlavour, theme_json: &str, mode: &str) -> Outcome {
    if !flavour.home.is_dir() {
        return Outcome::Skipped(format!("{} not installed", flavour.label));
    }
    let ext_base = flavour.home.join("extensions");
    let ext_dir = ext_base.join(format!("{EXTENSION_ID}-{EXTENSION_VERSION}"));
    let steps = || -> Result<(), String> {
        write_file(&ext_dir.join("themes/scuttlarr.json"), theme_json)?;
        write_file(&ext_dir.join("package.json"), &extension_manifest(mode))?;
        let registry = ext_base.join("extensions.json");
        let current = std::fs::read_to_string(&registry).unwrap_or_default();
        if !current.contains(&format!("\"{EXTENSION_ID}\"")) {
            std::fs::write(&registry, register_extension(&current, &ext_dir)?)
                .map_err(|e| format!("{}: {e}", registry.display()))?;
        }
        let obsolete = ext_base.join(".obsolete");
        if let Ok(text) = std::fs::read_to_string(&obsolete) {
            if let Ok(Value::Object(mut map)) = serde_json::from_str::<Value>(&text) {
                if map
                    .remove(&format!("{EXTENSION_ID}-{EXTENSION_VERSION}"))
                    .is_some()
                {
                    let out =
                        serde_json::to_string(&Value::Object(map)).map_err(|e| e.to_string())?;
                    std::fs::write(&obsolete, out)
                        .map_err(|e| format!("{}: {e}", obsolete.display()))?;
                }
            }
        }
        edit_file(&flavour.settings, |s| {
            set_string_key(s, "workbench.colorTheme", THEME_LABEL)
        })
    };
    match steps() {
        Ok(()) => Outcome::Done(format!("{} (extension + settings)", flavour.label)),
        Err(e) => Outcome::Failed(e),
    }
}

pub fn apply_zed(config_dir: &Path, theme_json: &str) -> Outcome {
    if !config_dir.is_dir() {
        return Outcome::Skipped("zed not installed".into());
    }
    let steps = || -> Result<(), String> {
        write_file(&config_dir.join("themes/scuttlarr.json"), theme_json)?;
        edit_file(&config_dir.join("settings.json"), |s| {
            set_string_key(s, "theme", THEME_LABEL)
        })
    };
    match steps() {
        Ok(()) => Outcome::Done("zed (theme + settings)".into()),
        Err(e) => Outcome::Failed(e),
    }
}

pub fn apply_neovim(colorscheme: &str, mode: &str) -> Outcome {
    let sockets: Vec<PathBuf> = nvim_run_dirs()
        .iter()
        .flat_map(|d| nvim_sockets(d))
        .collect();
    if sockets.is_empty() {
        return Outcome::Skipped("neovim not running".into());
    }
    let Some(nvim) = crate::deps::locate("nvim") else {
        return Outcome::Skipped("nvim not on PATH".into());
    };
    let background = if mode == "light" { "light" } else { "dark" };
    let keys = format!("<Cmd>set background={background}<CR><Cmd>colorscheme {colorscheme}<CR>");
    let mut sent = 0;
    let mut errors = Vec::new();
    for sock in &sockets {
        match std::process::Command::new(&nvim)
            .args(["--server"])
            .arg(sock)
            .args(["--remote-send", &keys])
            .output()
        {
            Ok(out) if out.status.success() => sent += 1,
            Ok(out) => errors.push(format!(
                "{}: {}",
                sock.display(),
                String::from_utf8_lossy(&out.stderr).trim()
            )),
            Err(e) => errors.push(format!("{}: {e}", sock.display())),
        }
    }
    if sent == 0 {
        Outcome::Failed(errors.join("; "))
    } else {
        Outcome::Done(format!("neovim ({sent} of {} instances)", sockets.len()))
    }
}

pub fn apply_helix(config_dir: &Path, theme: &str) -> Outcome {
    if !config_dir.is_dir() {
        return Outcome::Skipped("helix not installed".into());
    }
    if let Err(e) = edit_file(&config_dir.join("config.toml"), |s| {
        Ok(set_toml_root_string(s, "theme", theme))
    }) {
        return Outcome::Failed(e);
    }
    // Homebrew names the binary `hx`; some packages `helix`.
    match running(&["hx", "helix"]) {
        Some(name) => match signal("USR1", &name) {
            Ok(()) => Outcome::Done("helix (config + SIGUSR1)".into()),
            Err(e) => Outcome::Failed(e),
        },
        None => Outcome::Done("helix (config; next launch)".into()),
    }
}

pub fn apply_btop(config_dir: &Path, theme_text: &str) -> Outcome {
    if !config_dir.is_dir() {
        return Outcome::Skipped("btop not installed".into());
    }
    let steps = || -> Result<(), String> {
        write_file(&config_dir.join("themes/scuttlarr.theme"), theme_text)?;
        edit_file(&config_dir.join("btop.conf"), |s| {
            Ok(set_toml_root_string(s, "color_theme", THEME_LABEL))
        })
    };
    if let Err(e) = steps() {
        return Outcome::Failed(e);
    }
    match running(&["btop"]) {
        Some(_) => match signal("USR2", "btop") {
            Ok(()) => Outcome::Done("btop (theme + SIGUSR2)".into()),
            Err(e) => Outcome::Failed(e),
        },
        None => Outcome::Done("btop (theme; next launch)".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch() -> PathBuf {
        let d = std::env::temp_dir().join(format!(
            "scuttlarr-editors-{}-{}",
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
    fn json_set_preserves_other_keys_and_order() {
        let out = set_string_key(
            r#"{"editor.fontSize": 14, "workbench.colorTheme": "Dark+", "z": [1]}"#,
            "workbench.colorTheme",
            "scuttlarr",
        )
        .unwrap();
        assert_eq!(
            out,
            "{\n  \"editor.fontSize\": 14,\n  \"workbench.colorTheme\": \"scuttlarr\",\n  \"z\": [\n    1\n  ]\n}\n"
        );
        let added = set_string_key(r#"{"a": 1}"#, "theme", "scuttlarr").unwrap();
        assert_eq!(added, "{\n  \"a\": 1,\n  \"theme\": \"scuttlarr\"\n}\n");
        assert_eq!(
            set_string_key("", "theme", "scuttlarr").unwrap(),
            "{\n  \"theme\": \"scuttlarr\"\n}\n"
        );
    }

    #[test]
    fn json_set_retints_zed_mode_object() {
        let out = set_string_key(
            r#"{"theme": {"mode": "system", "light": "One Light", "dark": "One Dark"}}"#,
            "theme",
            "scuttlarr",
        )
        .unwrap();
        let v: Value = serde_json::from_str(&out).unwrap();
        assert_eq!(v["theme"]["mode"], "system");
        assert_eq!(v["theme"]["light"], "scuttlarr");
        assert_eq!(v["theme"]["dark"], "scuttlarr");
    }

    #[test]
    fn jsonc_set_edits_in_place_and_keeps_comments() {
        let src = "{\n  // my settings\n  \"editor.fontSize\": 14,\n  \"workbench.colorTheme\": \"Dark+\", // trailing\n}\n";
        let out = set_string_key(src, "workbench.colorTheme", "scuttlarr").unwrap();
        assert_eq!(
            out,
            "{\n  // my settings\n  \"editor.fontSize\": 14,\n  \"workbench.colorTheme\": \"scuttlarr\", // trailing\n}\n"
        );
        let added = set_string_key("{\n  // c\n  \"a\": 1,\n}\n", "theme", "x").unwrap();
        assert_eq!(added, "{\n  \"theme\": \"x\",\n  // c\n  \"a\": 1,\n}\n");
        let split = set_string_key("{} // hi", "theme", "x").unwrap();
        assert_eq!(split, "{\n  \"theme\": \"x\"\n} // hi");
        assert!(set_string_key(
            "{ // c\n \"theme\": { \"mode\": \"dark\" },\n}",
            "theme",
            "x"
        )
        .unwrap_err()
        .contains("by hand"));
    }

    #[test]
    fn toml_root_line_rewrites_or_inserts_before_sections() {
        let src = "# helix\ntheme = \"onedark\"\n\n[editor]\ntheme = \"nested\"\n";
        assert_eq!(
            set_toml_root_string(src, "theme", "dracula"),
            "# helix\ntheme = \"dracula\"\n\n[editor]\ntheme = \"nested\"\n"
        );
        assert_eq!(
            set_toml_root_string("[editor]\nline-number = \"relative\"\n", "theme", "nord"),
            "theme = \"nord\"\n[editor]\nline-number = \"relative\"\n"
        );
        assert_eq!(
            set_toml_root_string("", "theme", "nord"),
            "theme = \"nord\"\n"
        );
        assert_eq!(
            set_toml_root_string(
                "color_theme=\"Default\"\nvim_keys = False",
                "color_theme",
                "scuttlarr"
            ),
            "color_theme = \"scuttlarr\"\nvim_keys = False\n"
        );
        // `theme_x = …` is not `theme`.
        assert_eq!(
            set_toml_root_string("theme_x = \"1\"\n", "theme", "n"),
            "theme = \"n\"\ntheme_x = \"1\"\n"
        );
    }

    #[test]
    fn nvim_sockets_finds_pid_zero_endpoints_only() {
        let run = scratch();
        std::fs::create_dir_all(run.join("abc")).unwrap();
        std::fs::create_dir_all(run.join("def")).unwrap();
        std::fs::write(run.join("abc/nvim.100.0"), "").unwrap();
        std::fs::write(run.join("def/nvim.200.0"), "").unwrap();
        std::fs::write(run.join("def/nvim.200.1"), "").unwrap();
        std::fs::write(run.join("def/other"), "").unwrap();
        std::fs::write(run.join("nvim.300.0"), "").unwrap(); // not nested — not a server
        let found = nvim_sockets(&run);
        assert_eq!(
            found,
            vec![run.join("abc/nvim.100.0"), run.join("def/nvim.200.0")]
        );
        assert!(nvim_sockets(&run.join("missing")).is_empty());
    }

    #[test]
    fn extension_registry_replaces_our_entry_and_keeps_others() {
        let dir = PathBuf::from("/x/ext/scuttlarr.theme-0.0.1");
        let list = r#"[{"identifier":{"id":"other.ext"},"version":"1"},{"identifier":{"id":"scuttlarr.theme"},"version":"0.0.0"}]"#;
        let out = register_extension(list, &dir).unwrap();
        let v: Value = serde_json::from_str(&out).unwrap();
        let arr = v.as_array().unwrap();
        assert_eq!(arr.len(), 2);
        assert_eq!(arr[0]["identifier"]["id"], "other.ext");
        assert_eq!(arr[1]["identifier"]["id"], EXTENSION_ID);
        assert_eq!(arr[1]["location"]["fsPath"], "/x/ext/scuttlarr.theme-0.0.1");
        assert_eq!(arr[1]["relativeLocation"], "scuttlarr.theme-0.0.1");
        assert!(register_extension("{}", &dir).is_err());
        let fresh: Value = serde_json::from_str(&register_extension("", &dir).unwrap()).unwrap();
        assert_eq!(fresh.as_array().unwrap().len(), 1);
    }

    #[test]
    fn manifest_follows_mode_and_watches() {
        let v: Value = serde_json::from_str(&extension_manifest("light")).unwrap();
        assert_eq!(v["contributes"]["themes"][0]["uiTheme"], "vs");
        assert_eq!(v["contributes"]["themes"][0]["_watch"], true);
        assert_eq!(v["publisher"], "scuttlarr");
        let v: Value = serde_json::from_str(&extension_manifest("dark")).unwrap();
        assert_eq!(v["contributes"]["themes"][0]["uiTheme"], "vs-dark");
    }

    #[test]
    fn surfaces_skip_when_not_installed_and_back_up_once() {
        let home = scratch();
        assert_eq!(
            apply_zed(&home.join(".config/zed"), "{}"),
            Outcome::Skipped("zed not installed".into())
        );
        assert!(matches!(
            apply_btop(&home.join("nope"), ""),
            Outcome::Skipped(_)
        ));
        assert!(matches!(
            apply_helix(&home.join("nope"), "x"),
            Outcome::Skipped(_)
        ));
        let flavour = VsCodeFlavour {
            label: "vs code",
            home: home.join(".vscode"),
            settings: home.join("settings.json"),
        };
        assert!(matches!(
            apply_vscode(&flavour, "{}", "dark"),
            Outcome::Skipped(_)
        ));

        // Zed present: theme written, settings edited, one backup.
        let zed = home.join(".config/zed");
        std::fs::create_dir_all(&zed).unwrap();
        std::fs::write(
            zed.join("settings.json"),
            "{\n  \"theme\": \"One Dark\"\n}\n",
        )
        .unwrap();
        assert!(matches!(
            apply_zed(&zed, "{\"themes\":[]}"),
            Outcome::Done(_)
        ));
        assert!(zed.join("themes/scuttlarr.json").is_file());
        assert_eq!(
            std::fs::read_to_string(zed.join("settings.json.bak-scuttlarr")).unwrap(),
            "{\n  \"theme\": \"One Dark\"\n}\n"
        );
        assert!(std::fs::read_to_string(zed.join("settings.json"))
            .unwrap()
            .contains("\"scuttlarr\""));
        apply_zed(&zed, "{}");
        assert!(
            std::fs::read_to_string(zed.join("settings.json.bak-scuttlarr"))
                .unwrap()
                .contains("One Dark")
        );

        // VS Code present: extension dir, registry, settings.
        std::fs::create_dir_all(flavour.home.join("extensions")).unwrap();
        assert!(matches!(
            apply_vscode(&flavour, "{\"type\":\"dark\"}", "dark"),
            Outcome::Done(_)
        ));
        let ext = flavour.home.join("extensions/scuttlarr.theme-0.0.1");
        assert!(ext.join("themes/scuttlarr.json").is_file());
        assert!(ext.join("package.json").is_file());
        let reg = std::fs::read_to_string(flavour.home.join("extensions/extensions.json")).unwrap();
        assert!(reg.contains("\"scuttlarr.theme\""));
        let settings: Value =
            serde_json::from_str(&std::fs::read_to_string(&flavour.settings).unwrap()).unwrap();
        assert_eq!(settings["workbench.colorTheme"], "scuttlarr");
    }
}
