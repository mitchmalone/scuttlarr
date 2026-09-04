//! Plugins: directories in `~/.config/launcharr/plugins/<id>/` (docs/PLUGINS.md)
//! and the first-party set bundled with the app (`packages/plugins/`). A plugin
//! is `manifest.json` plus, optionally:
//!
//! - `service.ts` — its logic, run under Bun (runtime.rs) *out of the webview*.
//!   Stream mode (no `interval` in the manifest): kept alive, every stdout line
//!   is one JSON value that becomes the plugin's `state`; stdin carries
//!   `host.send()` messages as JSON lines. Tick mode (`interval` set): run as
//!   `service.ts tick` every N seconds, stdout = one JSON state — the
//!   docs/WIDGETS.md contract, so a tick widget is a plugin without UI files.
//! - `cell.tsx` / `panel.tsx` — its UI, React on `@launcharr/tui`, built with
//!   `bun build` on install/change into `~/.config/launcharr/.build/<id>/` and
//!   imported by the webview (src/plugins/loader.ts). Absent → the generic
//!   widget cell/card render the state (when it has the `WidgetView` shape).
//!
//! First-party plugins ship their UI statically (Vite bundles
//! `@launcharr/plugins`) and take their state from a Rust provider named by
//! the manifest's `native` field — usage.rs is one — so the app never depends
//! on Bun for its own panels. Third-party plugins never get `native`.
//!
//! Rust owns discovery, the dir watcher (a plugin dropped in is live; a source
//! edit rebuilds and hot-swaps; a service edit restarts it), the service
//! supervisor (restart with backoff, one child per plugin), and ships every
//! plugin's state in `BarSnapshot.plugins`. Failures keep the last state and
//! mark `error` — fail-visible, never a silent blank (DECISIONS 2026-08-27).

use std::{
    collections::HashMap,
    fs,
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{ChildStdin, Command, Stdio},
    sync::{
        atomic::{AtomicU64, Ordering},
        mpsc, Mutex,
    },
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::widgets::{WidgetAuth, WidgetRequire, WidgetSetting};

// ---- the contract ------------------------------------------------------

/// `panel` in a manifest: how the plugin's `panel.tsx` joins the launcher —
/// mirrored by `PluginPanelMeta` in @launcharr/tui.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PanelMeta {
    /// Row title; the plugin name when absent.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// Dim row copy ("token monitor ▸").
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hint: Option<String>,
    /// Extra trigger words beyond the id (`ss` for screenshots).
    #[serde(default)]
    pub triggers: Vec<String>,
    /// Extra fuzzy-match words.
    #[serde(default)]
    pub aliases: Vec<String>,
}

/// `manifest.json` — mirrored by `PluginManifest` in @launcharr/tui.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    #[serde(default = "default_schema")]
    pub schema_version: u32,
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub description: String,
    /// `bar-widget` | `panel` | `service` — what the plugin contributes.
    #[serde(default)]
    pub kinds: Vec<String>,
    /// Default zone for a cell the layout hasn't placed yet.
    #[serde(default = "default_zone")]
    pub zone: String,
    /// lucide icon name: the generic cell's glyph, the panel row's icon.
    #[serde(default)]
    pub icon: Option<String>,
    /// Present → tick mode (`service tick` every N seconds, min 5). Absent →
    /// stream mode (long-lived service).
    #[serde(default)]
    pub interval: Option<u64>,
    /// Seconds a tick may run before it is killed. Clamped to [1, 60].
    #[serde(default = "default_timeout")]
    pub timeout: u64,
    #[serde(default)]
    pub settings: Vec<WidgetSetting>,
    #[serde(default)]
    pub auth: Option<WidgetAuth>,
    #[serde(default)]
    pub requires: Vec<WidgetRequire>,
    #[serde(default)]
    pub panel: Option<PanelMeta>,
    /// First-party only: the Rust state provider (`usage`).
    #[serde(default)]
    pub native: Option<String>,
}

fn default_schema() -> u32 {
    1
}
fn default_zone() -> String {
    "right".into()
}
fn default_timeout() -> u64 {
    10
}

const MIN_INTERVAL: u64 = 5;
const MAX_TIMEOUT: u64 = 60;
const MAX_SETTINGS: usize = 16;
/// Backoff ceiling between service restarts.
const MAX_BACKOFF_SECS: u64 = 60;
/// A state line longer than this is a bug, not a state.
const MAX_LINE: usize = 1024 * 1024;
const STDERR_TAIL: usize = 400;
const BUILD_TIMEOUT: Duration = Duration::from_secs(60);
const CLONE_TIMEOUT: Duration = Duration::from_secs(90);
/// Modules the webview provides to plugin code — one React, one kit — so a
/// built plugin imports them instead of bundling a second copy (loader.ts
/// resolves these names to the app's own instances). `lucide-react` is shared
/// too: a plugin directory has no `node_modules`, so the icons must come from
/// the app (and the app already ships lucide's dynamic-icon set).
pub const SHARED_MODULES: [&str; 6] = [
    "react",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "react-dom",
    "@launcharr/tui",
    "lucide-react",
];

/// A plugin as the bar, launcher, and settings see it — mirrored by
/// `PluginState` in @launcharr/tui.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginState {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub kinds: Vec<String>,
    pub zone: String,
    pub icon: Option<String>,
    /// Bundled with the app (UI static, state native).
    pub first_party: bool,
    /// Not in `config.plugins.disabled`.
    pub enabled: bool,
    pub has_cell: bool,
    pub has_panel: bool,
    pub has_service: bool,
    /// Tick mode interval; None = stream or native.
    pub interval: Option<u64>,
    /// Epoch seconds of the last successful `bun build` — the loader's cache
    /// key, so an edit hot-swaps the module.
    pub built_at: Option<u64>,
    pub build_error: Option<String>,
    /// The last state the service emitted (or the native provider returned).
    pub state: Option<serde_json::Value>,
    /// Why the service last failed; None while healthy.
    pub error: Option<String>,
    pub last_ok: Option<u64>,
    pub updated_at: Option<u64>,
    /// Service restarts since discovery.
    pub restarts: u32,
    /// Stream service currently alive.
    pub running: bool,
    pub settings: Vec<WidgetSetting>,
    pub auth: Option<WidgetAuth>,
    pub requires: Vec<WidgetRequire>,
    /// Required settings currently unset; non-empty = not run, "needs setup".
    pub needs: Vec<String>,
    pub panel: Option<PanelMeta>,
}

// ---- registry ----------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Mode {
    /// State from a Rust provider (first-party).
    Native,
    /// Long-lived service, JSON lines.
    Stream,
    /// `service tick` every `interval`.
    Tick,
    /// UI only — no state source.
    Static,
}

struct Entry {
    manifest: PluginManifest,
    dir: PathBuf,
    service: Option<PathBuf>,
    state: PluginState,
    mode: Mode,
    /// Bumped whenever the service must stop (edit, disable, remove); the
    /// supervisor thread compares and exits.
    generation: u64,
    child_pid: Option<u32>,
    stdin: Option<ChildStdin>,
    next_due: Instant,
    running_tick: bool,
    /// Newest source mtime seen at the last build — rebuild when it moves.
    sources_mtime: Option<SystemTime>,
    /// The service file's own mtime — only *its* change restarts the service;
    /// a cell edit rebuilds the UI and leaves the process alone.
    service_mtime: Option<SystemTime>,
}

static PLUGINS: Mutex<Vec<Entry>> = Mutex::new(Vec::new());
static GENERATION: AtomicU64 = AtomicU64::new(1);
static DISABLED: Mutex<Vec<String>> = Mutex::new(Vec::new());

/// Manifests of the plugins bundled with the app (`packages/plugins/<id>/`).
/// Their UI is Vite-bundled; the manifest is embedded so discovery, the
/// settings list, and the panel registry treat them like any plugin.
const FIRST_PARTY: &[&str] = &[
    include_str!("../../../../packages/plugins/usage/manifest.json"),
    include_str!("../../../../packages/plugins/calendar/manifest.json"),
    include_str!("../../../../packages/plugins/updates/manifest.json"),
];

pub fn plugins_dir() -> PathBuf {
    crate::config::config_dir().join("plugins")
}

fn build_dir() -> PathBuf {
    crate::config::config_dir().join(".build")
}

/// Everything, in discovery order (first-party first, then alphabetical).
/// Native states are refreshed here — the snapshot is the 1 Hz path and the
/// providers are cached reads.
pub fn snapshot() -> Vec<PluginState> {
    let mut reg = PLUGINS.lock().unwrap();
    for e in reg.iter_mut() {
        if e.mode == Mode::Native && e.state.enabled {
            let name = e.manifest.native.clone().unwrap_or_default();
            e.state.state = native_state(&name);
        }
    }
    reg.iter().map(|e| e.state.clone()).collect()
}

/// One plugin's current view (the launcher's panel host polls this).
pub fn get(id: &str) -> Option<PluginState> {
    snapshot().into_iter().find(|p| p.id == id)
}

/// First-party state providers. A provider is a cached read, never a scan.
fn native_state(name: &str) -> Option<serde_json::Value> {
    match name {
        "usage" => {
            if !crate::usage::enabled() {
                return None;
            }
            serde_json::to_value(crate::usage::report()).ok()
        }
        // The calendar needs nothing but the clock the bar already carries.
        "clock" => Some(serde_json::json!({ "epoch": now_epoch() })),
        "updates" => serde_json::to_value(crate::updates::report()).ok(),
        _ => None,
    }
}

pub fn declares_secret(id: &str, key: &str) -> bool {
    PLUGINS
        .lock()
        .unwrap()
        .iter()
        .find(|e| e.state.id == id)
        .is_some_and(|e| e.manifest.settings.iter().any(|s| s.secret && s.key == key))
}

pub fn secret_keys_present(id: &str) -> Vec<String> {
    let keys: Vec<String> = PLUGINS
        .lock()
        .unwrap()
        .iter()
        .find(|e| e.state.id == id)
        .map(|e| {
            e.manifest
                .settings
                .iter()
                .filter(|s| s.secret)
                .map(|s| s.key.clone())
                .collect()
        })
        .unwrap_or_default();
    crate::widget_secrets::present(id, &keys)
}

pub fn has(id: &str) -> bool {
    PLUGINS.lock().unwrap().iter().any(|e| e.state.id == id)
}

/// Where a plugin's service file lives (for `auth`).
pub fn service_path(id: &str) -> Option<(PathBuf, Vec<WidgetSetting>)> {
    PLUGINS
        .lock()
        .unwrap()
        .iter()
        .find(|e| e.state.id == id)
        .and_then(|e| e.service.clone().map(|p| (p, e.manifest.settings.clone())))
}

fn now_epoch() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Plugin ids are file-safe words: they name dirs, trigger files, layout slots.
pub fn valid_id(id: &str) -> bool {
    crate::widgets::valid_id(id)
}

/// Parse and sanitize a manifest: id rules, clamps, kinds, settings.
pub fn parse_manifest(json: &str) -> Result<PluginManifest, String> {
    let mut m: PluginManifest = serde_json::from_str(json).map_err(|e| e.to_string())?;
    if m.schema_version != 1 {
        return Err(format!("unsupported schemaVersion {}", m.schema_version));
    }
    if !valid_id(&m.id) {
        return Err(format!("bad plugin id {:?}", m.id));
    }
    if m.name.is_empty() {
        m.name = m.id.clone();
    }
    if let Some(i) = m.interval {
        m.interval = Some(i.max(MIN_INTERVAL));
    }
    m.timeout = m.timeout.clamp(1, MAX_TIMEOUT);
    if !["left", "center", "right"].contains(&m.zone.as_str()) {
        m.zone = default_zone();
    }
    for k in &m.kinds {
        if !["bar-widget", "panel", "service"].contains(&k.as_str()) {
            return Err(format!("unknown kind {k:?}"));
        }
    }
    if m.settings.len() > MAX_SETTINGS {
        return Err(format!("too many settings (max {MAX_SETTINGS})"));
    }
    for s in &m.settings {
        if !crate::widgets::valid_setting_key(&s.key) {
            return Err(format!("bad setting key {:?}", s.key));
        }
    }
    Ok(m)
}

/// The first existing file among `<stem>.{ts,tsx,js,jsx,mjs}` or a bare
/// executable `<stem>` in `dir`.
fn find_entry(dir: &Path, stem: &str, exts: &[&str]) -> Option<PathBuf> {
    for ext in exts {
        let p = dir.join(format!("{stem}.{ext}"));
        if p.is_file() {
            return Some(p);
        }
    }
    let bare = dir.join(stem);
    (bare.is_file() && crate::deps::is_executable(&bare)).then_some(bare)
}

const SERVICE_EXTS: [&str; 4] = ["ts", "js", "mjs", "cjs"];
const UI_EXTS: [&str; 4] = ["tsx", "ts", "jsx", "js"];

/// Newest mtime under `dir` (skipping node_modules and dotfiles) — the
/// "did any source change" signal for rebuilds and service restarts.
fn sources_mtime(dir: &Path) -> Option<SystemTime> {
    fn walk(dir: &Path, depth: u32, newest: &mut Option<SystemTime>) {
        if depth > 4 {
            return;
        }
        let Ok(entries) = fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if name.starts_with('.') || name == "node_modules" {
                continue;
            }
            let path = entry.path();
            if path.is_dir() {
                walk(&path, depth + 1, newest);
            } else if let Ok(m) = entry.metadata().and_then(|m| m.modified()) {
                if newest.is_none_or(|n| m > n) {
                    *newest = Some(m);
                }
            }
        }
    }
    let mut newest = None;
    walk(dir, 0, &mut newest);
    newest
}

// ---- discovery ---------------------------------------------------------

/// First-party manifests + every `<plugins>/<dir>/manifest.json`, sorted by
/// id; a user plugin can't shadow a first-party id.
fn discover(dir: &Path) -> Vec<(PluginManifest, PathBuf, bool)> {
    let mut found: Vec<(PluginManifest, PathBuf, bool)> = Vec::new();
    for json in FIRST_PARTY {
        match parse_manifest(json) {
            Ok(m) => found.push((m, PathBuf::new(), true)),
            Err(e) => crate::logbook::breadcrumb("plugins", &format!("first-party manifest: {e}")),
        }
    }
    let mut user = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        let mut dirs: Vec<PathBuf> = entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.is_dir())
            .collect();
        dirs.sort();
        for d in dirs {
            let manifest = d.join("manifest.json");
            if !manifest.is_file() {
                continue;
            }
            match fs::read_to_string(&manifest)
                .map_err(|e| e.to_string())
                .and_then(|s| parse_manifest(&s))
            {
                Ok(m) => {
                    if m.native.is_some() {
                        crate::logbook::breadcrumb(
                            "plugins",
                            &format!("{}: `native` is first-party only — ignored", m.id),
                        );
                        continue;
                    }
                    if found.iter().any(|(f, _, _)| f.id == m.id) {
                        crate::logbook::breadcrumb(
                            "plugins",
                            &format!("{}: shadows a bundled plugin — skipped", m.id),
                        );
                        continue;
                    }
                    user.push((m, d, false));
                }
                Err(e) => {
                    crate::logbook::breadcrumb("plugins", &format!("{}: {e}", manifest.display()))
                }
            }
        }
    }
    user.sort_by(|a, b| a.0.id.cmp(&b.0.id));
    user.dedup_by(|a, b| a.0.id == b.0.id);
    found.extend(user);
    found
}

fn mode_for(m: &PluginManifest, service: bool) -> Mode {
    if m.native.is_some() {
        Mode::Native
    } else if !service {
        Mode::Static
    } else if m.interval.is_some() {
        Mode::Tick
    } else {
        Mode::Stream
    }
}

fn fresh_state(m: &PluginManifest, first_party: bool, dir: &Path) -> PluginState {
    let service = !first_party && find_entry(dir, "service", &SERVICE_EXTS).is_some();
    PluginState {
        id: m.id.clone(),
        name: m.name.clone(),
        version: m.version.clone(),
        description: m.description.clone(),
        kinds: m.kinds.clone(),
        zone: m.zone.clone(),
        icon: m.icon.clone(),
        first_party,
        enabled: !DISABLED.lock().unwrap().contains(&m.id),
        has_cell: first_party || find_entry(dir, "cell", &UI_EXTS).is_some(),
        has_panel: first_party || find_entry(dir, "panel", &UI_EXTS).is_some(),
        has_service: service,
        interval: m.interval,
        built_at: None,
        build_error: None,
        state: None,
        error: None,
        last_ok: None,
        updated_at: None,
        restarts: 0,
        running: false,
        settings: m.settings.clone(),
        auth: m.auth.clone(),
        requires: m.requires.clone(),
        needs: Vec::new(),
        panel: m.panel.clone(),
    }
}

/// Rebuild the registry from disk. A plugin whose id and dir survive keeps
/// its state and its running service unless its sources changed; anything
/// new is built and started. Stale services are stopped.
fn refresh(app: &AppHandle) {
    let found = discover(&plugins_dir());
    let mut to_stop: Vec<(u64, Option<u32>)> = Vec::new();
    let mut to_start: Vec<(String, u64)> = Vec::new();
    let mut to_build: Vec<String> = Vec::new();
    {
        let mut reg = PLUGINS.lock().unwrap();
        let mut old: HashMap<String, Entry> =
            reg.drain(..).map(|e| (e.state.id.clone(), e)).collect();
        for (manifest, dir, first_party) in found {
            let service = if first_party {
                None
            } else {
                find_entry(&dir, "service", &SERVICE_EXTS)
            };
            let mode = mode_for(&manifest, service.is_some());
            let mtime = if first_party {
                None
            } else {
                sources_mtime(&dir)
            };
            let svc_mtime = service
                .as_ref()
                .and_then(|p| fs::metadata(p).and_then(|m| m.modified()).ok());
            let enabled = !DISABLED.lock().unwrap().contains(&manifest.id);
            let mut entry = match old.remove(&manifest.id) {
                Some(prev) if prev.dir == dir => prev,
                Some(prev) => {
                    to_stop.push((prev.generation, prev.child_pid));
                    new_entry(&manifest, dir.clone(), first_party, service.clone(), mode)
                }
                None => new_entry(&manifest, dir.clone(), first_party, service.clone(), mode),
            };
            let changed_ui = entry.sources_mtime != mtime;
            let changed = entry.service_mtime != svc_mtime
                || entry.manifest != manifest
                || entry.service != service
                || entry.mode != mode;
            // Manifest fields may have been edited in place.
            let keep = (
                entry.state.state.clone(),
                entry.state.error.clone(),
                entry.state.last_ok,
                entry.state.updated_at,
                entry.state.restarts,
                entry.state.built_at,
                entry.state.build_error.clone(),
            );
            entry.state = fresh_state(&manifest, first_party, &dir);
            entry.state.state = keep.0;
            entry.state.error = keep.1;
            entry.state.last_ok = keep.2;
            entry.state.updated_at = keep.3;
            entry.state.restarts = keep.4;
            entry.state.built_at = keep.5;
            entry.state.build_error = keep.6;
            entry.state.running = entry.child_pid.is_some();
            entry.manifest = manifest;
            entry.service = service;
            entry.mode = mode;
            let was_enabled = entry.child_pid.is_some() || entry.generation != 0;
            if changed || enabled != was_enabled {
                // Stop whatever ran for the old sources; start afresh below.
                if entry.child_pid.is_some() || entry.generation != 0 {
                    to_stop.push((entry.generation, entry.child_pid.take()));
                    entry.stdin = None;
                    entry.state.running = false;
                }
                entry.generation = 0;
            }
            if (changed || changed_ui) && !first_party {
                to_build.push(entry.state.id.clone());
            }
            entry.sources_mtime = mtime;
            entry.service_mtime = svc_mtime;
            if enabled && entry.generation == 0 && mode != Mode::Native && mode != Mode::Static {
                entry.generation = GENERATION.fetch_add(1, Ordering::SeqCst);
                match mode {
                    Mode::Stream => to_start.push((entry.state.id.clone(), entry.generation)),
                    Mode::Tick => {
                        entry.next_due = Instant::now();
                        entry.running_tick = false;
                    }
                    _ => {}
                }
            }
            reg.push(entry);
        }
        for (_, gone) in old {
            to_stop.push((gone.generation, gone.child_pid));
        }
        let ids = reg
            .iter()
            .map(|e| e.state.id.as_str())
            .collect::<Vec<_>>()
            .join(", ");
        crate::logbook::breadcrumb("plugins", &format!("{} plugin(s): {ids}", reg.len()));
    }
    for (_, pid) in to_stop {
        kill(pid);
    }
    for id in to_build {
        build_plugin(&id);
    }
    for (id, generation) in to_start {
        let app = app.clone();
        std::thread::spawn(move || supervise(app, id, generation));
    }
    let _ = app.emit("plugins-changed", ());
}

fn new_entry(
    manifest: &PluginManifest,
    dir: PathBuf,
    first_party: bool,
    service: Option<PathBuf>,
    mode: Mode,
) -> Entry {
    Entry {
        state: fresh_state(manifest, first_party, &dir),
        manifest: manifest.clone(),
        dir,
        service,
        mode,
        generation: 0,
        child_pid: None,
        stdin: None,
        next_due: Instant::now(),
        running_tick: false,
        sources_mtime: None,
        service_mtime: None,
    }
}

fn kill(pid: Option<u32>) {
    if let Some(pid) = pid {
        let _ = Command::new("kill").arg(pid.to_string()).status();
    }
}

/// Apply `config.plugins.disabled` (setup + config watcher): stops disabled
/// services, starts newly enabled ones.
pub fn configure(app: &AppHandle, disabled: &[String]) {
    let changed = {
        let mut d = DISABLED.lock().unwrap();
        if *d == disabled {
            false
        } else {
            *d = disabled.to_vec();
            true
        }
    };
    if changed {
        refresh(app);
        crate::bar::push(app);
    }
}

// ---- building UI modules ------------------------------------------------

/// `bun build` a plugin's `cell.tsx` / `panel.tsx` into the build dir. Bun
/// only — Node has no TSX. Records `built_at` or the error on the entry.
fn build_plugin(id: &str) {
    let (dir, sources) = {
        let reg = PLUGINS.lock().unwrap();
        let Some(e) = reg.iter().find(|e| e.state.id == id) else {
            return;
        };
        let mut sources = Vec::new();
        for stem in ["cell", "panel"] {
            if let Some(p) = find_entry(&e.dir, stem, &UI_EXTS) {
                sources.push((stem, p));
            }
        }
        (e.dir.clone(), sources)
    };
    if sources.is_empty() {
        return;
    }
    let result = build_sources(&dir, id, &sources);
    let mut reg = PLUGINS.lock().unwrap();
    if let Some(e) = reg.iter_mut().find(|e| e.state.id == id) {
        match result {
            Ok(()) => {
                e.state.built_at = Some(now_epoch());
                e.state.build_error = None;
                crate::logbook::breadcrumb("plugins", &format!("{id}: built"));
            }
            Err(err) => {
                crate::logbook::breadcrumb("plugins", &format!("{id} build: {err}"));
                e.state.build_error = Some(err);
            }
        }
    }
}

fn build_sources(dir: &Path, id: &str, sources: &[(&str, PathBuf)]) -> Result<(), String> {
    let rt =
        crate::runtime::js_runtime().ok_or_else(|| crate::runtime::NO_RUNTIME_HINT.to_string())?;
    if !rt.bun {
        return Err("plugin UI needs bun — brew install oven-sh/bun/bun".into());
    }
    let out_dir = build_dir().join(id);
    fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;
    for (stem, src) in sources {
        let out = out_dir.join(format!("{stem}.js"));
        let mut cmd = Command::new(&rt.path);
        cmd.arg("build")
            .arg(src)
            .arg("--format=esm")
            .arg("--target=browser")
            .arg(format!("--outfile={}", out.display()))
            .env("NODE_ENV", "production")
            .current_dir(dir);
        for m in SHARED_MODULES {
            cmd.arg("--external").arg(m);
        }
        crate::widgets::run(&mut cmd, BUILD_TIMEOUT).map_err(|e| format!("{stem}: {e}"))?;
    }
    Ok(())
}

/// The built module's source for the webview (`plugin_module` command).
pub fn module_source(id: &str, file: &str) -> Result<String, String> {
    if !valid_id(id) || !["cell", "panel"].contains(&file) {
        return Err(format!("bad module {id}/{file}"));
    }
    let path = build_dir().join(id).join(format!("{file}.js"));
    let src = fs::read_to_string(&path).map_err(|e| format!("{}: {e}", path.display()))?;
    crate::logbook::breadcrumb(
        "plugins",
        &format!("{id}: webview loaded {file}.js ({} bytes)", src.len()),
    );
    Ok(src)
}

// ---- stream services ----------------------------------------------------

/// Keep `id`'s service alive for as long as `generation` is current: spawn,
/// stream its lines into state, restart with backoff when it exits.
fn supervise(app: AppHandle, id: String, generation: u64) {
    let mut backoff: u64 = 1;
    loop {
        let Some((service, settings, timeout)) = ({
            let reg = PLUGINS.lock().unwrap();
            reg.iter()
                .find(|e| e.state.id == id && e.generation == generation)
                .and_then(|e| {
                    e.service
                        .clone()
                        .map(|s| (s, e.manifest.settings.clone(), e.manifest.timeout))
                })
        }) else {
            return;
        };
        let (env, needs) = crate::widgets::settings_for(&app, &id, &settings);
        if !needs.is_empty() {
            set_needs(&id, needs);
            crate::bar::push(&app);
            if !sleep_unless_stale(&id, generation, Duration::from_secs(5)) {
                return;
            }
            continue;
        }
        set_needs(&id, Vec::new());
        let started = Instant::now();
        match run_stream(&app, &id, generation, &service, &env) {
            Ok(()) => {}
            Err(err) => {
                let mut reg = PLUGINS.lock().unwrap();
                if let Some(e) = reg
                    .iter_mut()
                    .find(|e| e.state.id == id && e.generation == generation)
                {
                    crate::logbook::breadcrumb("plugins", &format!("{id}: {err}"));
                    e.state.error = Some(err);
                    e.state.updated_at = Some(now_epoch());
                }
            }
        }
        {
            let mut reg = PLUGINS.lock().unwrap();
            let Some(e) = reg
                .iter_mut()
                .find(|e| e.state.id == id && e.generation == generation)
            else {
                return;
            };
            e.child_pid = None;
            e.stdin = None;
            e.state.running = false;
            e.state.restarts = e.state.restarts.saturating_add(1);
        }
        crate::bar::push(&app);
        // A service that lived a while earned a fresh backoff.
        if started.elapsed() > Duration::from_secs(60) {
            backoff = 1;
        }
        let _ = timeout;
        if !sleep_unless_stale(&id, generation, Duration::from_secs(backoff)) {
            return;
        }
        backoff = next_backoff(backoff);
    }
}

/// Exponential, capped: 1, 2, 4, … 60.
pub fn next_backoff(current: u64) -> u64 {
    (current * 2).min(MAX_BACKOFF_SECS)
}

/// Sleep `d` in slices, returning false as soon as `generation` is stale.
fn sleep_unless_stale(id: &str, generation: u64, d: Duration) -> bool {
    let until = Instant::now() + d;
    while Instant::now() < until {
        std::thread::sleep(Duration::from_millis(200));
        let current = PLUGINS
            .lock()
            .unwrap()
            .iter()
            .any(|e| e.state.id == id && e.generation == generation);
        if !current {
            return false;
        }
    }
    true
}

fn set_needs(id: &str, needs: Vec<String>) {
    let mut reg = PLUGINS.lock().unwrap();
    if let Some(e) = reg.iter_mut().find(|e| e.state.id == id) {
        if !needs.is_empty() {
            e.state.state = None;
        }
        e.state.needs = needs;
    }
}

/// One life of a stream service. Ok when it exited on its own with status 0
/// (or was stopped); Err with the reason otherwise.
fn run_stream(
    app: &AppHandle,
    id: &str,
    generation: u64,
    service: &Path,
    env: &[(String, String)],
) -> Result<(), String> {
    let mut cmd = crate::runtime::command_for(service)?;
    for (k, v) in env {
        cmd.env(k, v);
    }
    cmd.env("LAUNCHARR_PLUGIN", id);
    if let Some(dir) = service.parent() {
        cmd.current_dir(dir);
    }
    let mut child = cmd
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn failed: {e}"))?;
    let pid = child.id();
    crate::logbook::breadcrumb("plugins", &format!("{id}: service started (pid {pid})"));
    let stdin = child.stdin.take();
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take();
    {
        let mut reg = PLUGINS.lock().unwrap();
        match reg
            .iter_mut()
            .find(|e| e.state.id == id && e.generation == generation)
        {
            Some(e) => {
                e.child_pid = Some(pid);
                e.stdin = stdin;
                e.state.running = true;
                e.state.error = None;
            }
            None => {
                // Stopped between the decision and the spawn.
                let _ = child.kill();
                let _ = child.wait();
                return Ok(());
            }
        }
    }
    crate::bar::push(app);
    // stderr on its own thread: the tail lands in the error when it exits,
    // and every line goes to our log so a plugin can be debugged from Console.
    let err_id = id.to_string();
    let err_h = std::thread::spawn(move || {
        let mut tail = String::new();
        if let Some(stderr) = stderr {
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                eprintln!("[plugin {err_id}] {line}");
                tail.push_str(&line);
                tail.push('\n');
                if tail.len() > STDERR_TAIL * 4 {
                    let cut = tail.len() - STDERR_TAIL;
                    tail = tail[cut..].to_string();
                }
            }
        }
        tail
    });
    let mut reader = BufReader::new(stdout);
    let mut line = String::new();
    let mut first = true;
    loop {
        line.clear();
        match reader.read_line(&mut line) {
            Ok(0) => break,
            Ok(_) => {}
            Err(_) => break,
        }
        if line.len() > MAX_LINE {
            record_error(id, generation, "state line over 1 MiB");
            continue;
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        match serde_json::from_str::<serde_json::Value>(trimmed) {
            Ok(value) => {
                if first {
                    first = false;
                    crate::logbook::breadcrumb(
                        "plugins",
                        &format!("{id}: first state ({} bytes)", trimmed.len()),
                    );
                }
                let mut reg = PLUGINS.lock().unwrap();
                if let Some(e) = reg
                    .iter_mut()
                    .find(|e| e.state.id == id && e.generation == generation)
                {
                    let now = now_epoch();
                    e.state.state = Some(value);
                    e.state.error = None;
                    e.state.last_ok = Some(now);
                    e.state.updated_at = Some(now);
                }
                drop(reg);
                crate::bar::push(app);
            }
            Err(e) => record_error(id, generation, &format!("bad state line: {e}")),
        }
    }
    let status = child.wait().map_err(|e| format!("wait failed: {e}"))?;
    crate::logbook::breadcrumb("plugins", &format!("{id}: service exited ({status})"));
    let tail = err_h.join().unwrap_or_default();
    let stale = !PLUGINS
        .lock()
        .unwrap()
        .iter()
        .any(|e| e.state.id == id && e.generation == generation);
    if stale || status.success() {
        return Ok(());
    }
    let tail = tail.trim();
    let tail = if tail.len() > STDERR_TAIL {
        &tail[tail.len() - STDERR_TAIL..]
    } else {
        tail
    };
    let code = status
        .code()
        .map_or("signal".to_string(), |c| c.to_string());
    Err(if tail.is_empty() {
        format!("service exited ({code})")
    } else {
        format!("service exited ({code}): {tail}")
    })
}

fn record_error(id: &str, generation: u64, err: &str) {
    let mut reg = PLUGINS.lock().unwrap();
    if let Some(e) = reg
        .iter_mut()
        .find(|e| e.state.id == id && e.generation == generation)
    {
        crate::logbook::breadcrumb("plugins", &format!("{id}: {err}"));
        e.state.error = Some(err.to_string());
        e.state.updated_at = Some(now_epoch());
    }
}

/// A native provider's own message handling — currently just `updates`,
/// whose panel refreshes on `{"refresh":true}` or runs a source's upgrade
/// command on `{"upgrade":"<sourceId>|all"}` instead of talking to a
/// service's stdin. `None` = this native id has no handler for `message`.
fn native_send(
    name: &str,
    message: &serde_json::Value,
    config: &crate::config::Config,
) -> Option<Result<(), String>> {
    match name {
        "updates" if message.get("refresh").and_then(|r| r.as_bool()) == Some(true) => {
            crate::updates::refresh();
            Some(Ok(()))
        }
        "updates" if message.get("upgrade").and_then(|u| u.as_str()).is_some() => {
            // infallible: guarded by is_some() above
            let source = message.get("upgrade").unwrap().as_str().unwrap();
            Some(upgrade_in_terminal(source, config))
        }
        _ => None,
    }
}

/// Run a source's upgrade command in the user's configured terminal — same
/// hand-off as bang mode (`commands.rs::run_bang`): resolve the effective
/// terminal, open a new window/tab per `bang_new_window`, fire-and-forget.
fn upgrade_in_terminal(source: &str, config: &crate::config::Config) -> Result<(), String> {
    let command = crate::updates::upgrade_command(source)
        .ok_or_else(|| format!("unknown update source: {source}"))?;
    crate::terminal::run(config.terminal, &command, config.bang_new_window)
        .map_err(|e| e.to_string())?;
    let terminal = match crate::terminal::effective_terminal(config.terminal) {
        crate::config::Terminal::ITerm2 => "iTerm2",
        crate::config::Terminal::TerminalApp => "Terminal",
    };
    crate::logbook::breadcrumb("updates", &format!("upgrade {source} → {terminal}"));
    Ok(())
}

/// `host.send(message)`: one JSON line on the service's stdin, or a native
/// provider's own handler when the plugin has no service (Mode::Native).
pub fn send(
    id: &str,
    message: &serde_json::Value,
    config: &crate::config::Config,
) -> Result<(), String> {
    let native = {
        let reg = PLUGINS.lock().unwrap();
        let e = reg
            .iter()
            .find(|e| e.state.id == id)
            .ok_or_else(|| format!("no plugin {id}"))?;
        (e.mode == Mode::Native).then(|| e.manifest.native.clone())
    };
    if let Some(name) = native {
        let name = name.unwrap_or_default();
        return native_send(&name, message, config)
            .unwrap_or_else(|| Err(format!("{id} has no message handler")));
    }
    let mut reg = PLUGINS.lock().unwrap();
    let e = reg
        .iter_mut()
        .find(|e| e.state.id == id)
        .ok_or_else(|| format!("no plugin {id}"))?;
    let stdin = e
        .stdin
        .as_mut()
        .ok_or_else(|| format!("{id} has no running service"))?;
    let line = serde_json::to_string(message).map_err(|e| e.to_string())?;
    crate::logbook::breadcrumb("plugins", &format!("{id}: send {} bytes", line.len()));
    stdin
        .write_all(line.as_bytes())
        .and_then(|_| stdin.write_all(b"\n"))
        .and_then(|_| stdin.flush())
        .map_err(|e| format!("send failed: {e}"))
}

// ---- tick services ------------------------------------------------------

/// Ask for a tick now (trigger file, settings change). Stream services get a
/// `{"poke":true}` line instead; a native provider with its own refresh
/// (`updates`) is kicked directly. Unknown ids are ignored.
pub fn poke(id: &str) {
    let mut refresh_updates = false;
    {
        let mut reg = PLUGINS.lock().unwrap();
        if let Some(e) = reg.iter_mut().find(|e| e.state.id == id) {
            match e.mode {
                Mode::Tick => e.next_due = Instant::now(),
                Mode::Stream => {
                    if let Some(stdin) = e.stdin.as_mut() {
                        let _ = stdin
                            .write_all(b"{\"poke\":true}\n")
                            .and_then(|_| stdin.flush());
                    }
                }
                Mode::Native => {
                    refresh_updates = e.manifest.native.as_deref() == Some("updates");
                }
                Mode::Static => {}
            }
        }
    }
    if refresh_updates {
        crate::updates::refresh();
    }
}

fn tick(
    app: AppHandle,
    id: String,
    generation: u64,
    service: PathBuf,
    timeout: Duration,
    settings: Vec<WidgetSetting>,
) {
    let (env, needs) = crate::widgets::settings_for(&app, &id, &settings);
    let result = if needs.is_empty() {
        let out = || -> Result<serde_json::Value, String> {
            let mut cmd = crate::runtime::command_for(&service)?;
            cmd.arg("tick");
            for (k, v) in &env {
                cmd.env(k, v);
            }
            cmd.env("LAUNCHARR_PLUGIN", &id);
            if let Some(dir) = service.parent() {
                cmd.current_dir(dir);
            }
            let stdout = crate::widgets::run(&mut cmd, timeout)?;
            serde_json::from_str(&stdout).map_err(|e| format!("bad tick output: {e}"))
        };
        Some(out())
    } else {
        None
    };
    let now = now_epoch();
    {
        let mut reg = PLUGINS.lock().unwrap();
        if let Some(e) = reg
            .iter_mut()
            .find(|e| e.state.id == id && e.generation == generation)
        {
            e.state.needs = needs;
            match result {
                Some(Ok(value)) => {
                    e.state.state = Some(value);
                    e.state.error = None;
                    e.state.last_ok = Some(now);
                }
                Some(Err(err)) => {
                    crate::logbook::breadcrumb("plugins", &format!("{id}: {err}"));
                    e.state.error = Some(err);
                }
                None => {
                    e.state.state = None;
                    e.state.error = None;
                }
            }
            e.state.updated_at = Some(now);
            e.running_tick = false;
            e.next_due =
                Instant::now() + Duration::from_secs(e.manifest.interval.unwrap_or(MIN_INTERVAL));
        }
    }
    crate::bar::push(&app);
}

/// Restart a plugin: stream service killed (the supervisor respawns it), tick
/// run now, UI rebuilt. The settings "restart" button and the gallery's `r`.
pub fn restart(app: &AppHandle, id: &str) -> Result<(), String> {
    let (pid, first_party) = {
        let reg = PLUGINS.lock().unwrap();
        let e = reg
            .iter()
            .find(|e| e.state.id == id)
            .ok_or_else(|| format!("no plugin {id}"))?;
        (e.child_pid, e.state.first_party)
    };
    kill(pid);
    poke(id);
    if !first_party {
        build_plugin(id);
    }
    let _ = app.emit("plugins-changed", ());
    crate::bar::push(app);
    Ok(())
}

// ---- install / remove ---------------------------------------------------

/// `git clone --depth 1 <url>` into the plugins dir, validated by its
/// manifest before it is kept. User-initiated, one request (the same
/// carve-out as the widget URL install, DECISIONS 2026-08-09). Returns the id.
pub fn install(url: &str) -> Result<String, String> {
    let url = url.trim();
    if !(url.starts_with("https://") || url.starts_with("http://") || url.starts_with("git@")) {
        return Err("a git URL (https://… or git@…)".into());
    }
    if url
        .chars()
        .any(|c| c.is_whitespace() || c == '\'' || c == '"')
    {
        return Err("bad git URL".into());
    }
    let git = crate::deps::locate("git")
        .or_else(|| Some(PathBuf::from("/usr/bin/git")))
        .filter(|p| crate::deps::is_executable(p))
        .ok_or("git not found — xcode-select --install")?;
    let dir = plugins_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let tmp = dir.join(format!(".installing-{}", now_epoch()));
    let _ = fs::remove_dir_all(&tmp);
    let mut cmd = Command::new(git);
    cmd.args(["clone", "--depth", "1", "--quiet", url])
        .arg(&tmp)
        .env("GIT_TERMINAL_PROMPT", "0");
    if let Err(e) = crate::widgets::run(&mut cmd, CLONE_TIMEOUT) {
        let _ = fs::remove_dir_all(&tmp);
        return Err(format!("clone failed: {e}"));
    }
    let manifest = tmp.join("manifest.json");
    let parsed = fs::read_to_string(&manifest)
        .map_err(|_| "not a plugin (no manifest.json)".to_string())
        .and_then(|s| parse_manifest(&s));
    let m = match parsed {
        Ok(m) => m,
        Err(e) => {
            let _ = fs::remove_dir_all(&tmp);
            return Err(format!("not a plugin ({e})"));
        }
    };
    let dest = dir.join(&m.id);
    if dest.exists() {
        let _ = fs::remove_dir_all(&tmp);
        return Err(format!("{} is already installed — remove it first", m.id));
    }
    fs::rename(&tmp, &dest).map_err(|e| e.to_string())?;
    Ok(m.id)
}

/// Delete a user plugin's dir by id (never a first-party one, never a path
/// outside the plugins dir). The watcher drops the entry and stops its service.
pub fn remove(id: &str) -> Result<(), String> {
    let dir = {
        let reg = PLUGINS.lock().unwrap();
        let e = reg
            .iter()
            .find(|e| e.state.id == id)
            .ok_or_else(|| format!("no plugin {id}"))?;
        if e.state.first_party {
            return Err(format!("{id} ships with launcharr — disable it instead"));
        }
        e.dir.clone()
    };
    if dir.parent() != Some(plugins_dir().as_path()) {
        return Err(format!("{} is outside the plugins dir", dir.display()));
    }
    fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    let _ = fs::remove_dir_all(build_dir().join(id));
    Ok(())
}

// ---- start ---------------------------------------------------------------

/// Discovery, the dir watcher, and the tick scheduler. Idempotent per process.
pub fn start(app: AppHandle, disabled: &[String]) {
    static STARTED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
    if STARTED.swap(true, Ordering::SeqCst) {
        return;
    }
    *DISABLED.lock().unwrap() = disabled.to_vec();
    let dir = plugins_dir();
    let _ = fs::create_dir_all(&dir);

    let watch_app = app.clone();
    std::thread::spawn(move || {
        refresh(&watch_app);
        crate::bar::push(&watch_app);
        use notify::{RecursiveMode, Watcher};
        let (tx, rx) = mpsc::channel();
        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                crate::logbook::breadcrumb("plugins", &format!("watcher failed: {e}"));
                return;
            }
        };
        if watcher.watch(&dir, RecursiveMode::Recursive).is_err() {
            return;
        }
        loop {
            if rx.recv().is_err() {
                return;
            }
            // Editor save bursts and `git clone` land as many events.
            while rx.recv_timeout(Duration::from_millis(500)).is_ok() {}
            refresh(&watch_app);
            crate::bar::push(&watch_app);
        }
    });

    std::thread::spawn(move || loop {
        let due: Vec<(String, u64, PathBuf, Duration, Vec<WidgetSetting>)> = {
            let mut reg = PLUGINS.lock().unwrap();
            let now = Instant::now();
            reg.iter_mut()
                .filter(|e| {
                    e.mode == Mode::Tick
                        && e.state.enabled
                        && e.generation != 0
                        && !e.running_tick
                        && e.next_due <= now
                })
                .filter_map(|e| {
                    e.running_tick = true;
                    e.service.clone().map(|s| {
                        (
                            e.state.id.clone(),
                            e.generation,
                            s,
                            Duration::from_secs(e.manifest.timeout),
                            e.manifest.settings.clone(),
                        )
                    })
                })
                .collect()
        };
        for (id, generation, service, timeout, settings) in due {
            let app = app.clone();
            std::thread::spawn(move || tick(app, id, generation, service, timeout, settings));
        }
        std::thread::sleep(Duration::from_secs(1));
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn manifest_parses_with_defaults_and_clamps() {
        let m =
            parse_manifest(r#"{"id":"hello","kinds":["bar-widget"],"interval":1,"timeout":900}"#)
                .unwrap();
        assert_eq!(m.name, "hello");
        assert_eq!(m.schema_version, 1);
        assert_eq!(m.interval, Some(MIN_INTERVAL));
        assert_eq!(m.timeout, MAX_TIMEOUT);
        assert_eq!(m.zone, "right");
        assert!(m.native.is_none());
    }

    #[test]
    fn manifest_rejects_bad_ids_kinds_and_schema() {
        assert!(parse_manifest(r#"{"id":"Hello World"}"#).is_err());
        assert!(parse_manifest(r#"{"id":"x","kinds":["overlay"]}"#).is_err());
        assert!(parse_manifest(r#"{"id":"x","schemaVersion":2}"#).is_err());
        assert!(parse_manifest(r#"{"id":"x","settings":[{"key":"lower"}]}"#).is_err());
    }

    #[test]
    fn first_party_manifests_are_valid() {
        for json in FIRST_PARTY {
            let m = parse_manifest(json).expect("bundled manifest parses");
            assert!(m.native.is_some(), "{} needs a native provider", m.id);
        }
    }

    #[test]
    fn mode_follows_manifest_and_files() {
        let mut m = parse_manifest(r#"{"id":"x"}"#).unwrap();
        assert_eq!(mode_for(&m, false), Mode::Static);
        assert_eq!(mode_for(&m, true), Mode::Stream);
        m.interval = Some(30);
        assert_eq!(mode_for(&m, true), Mode::Tick);
        m.native = Some("usage".into());
        assert_eq!(mode_for(&m, false), Mode::Native);
    }

    #[test]
    fn backoff_doubles_and_caps() {
        assert_eq!(next_backoff(1), 2);
        assert_eq!(next_backoff(32), 60);
        assert_eq!(next_backoff(60), 60);
    }

    #[test]
    fn module_source_rejects_bad_names() {
        assert!(module_source("../x", "cell").is_err());
        assert!(module_source("x", "service").is_err());
    }

    #[test]
    fn install_rejects_non_git_urls() {
        assert!(install("ftp://x").is_err());
        assert!(install("https://x y").is_err());
    }

    #[test]
    fn find_entry_prefers_listed_extensions() {
        let dir = std::env::temp_dir().join(format!("launcharr-plugins-{}", std::process::id()));
        let _ = fs::create_dir_all(&dir);
        fs::write(dir.join("cell.tsx"), "").unwrap();
        assert_eq!(
            find_entry(&dir, "cell", &UI_EXTS),
            Some(dir.join("cell.tsx"))
        );
        assert_eq!(find_entry(&dir, "panel", &UI_EXTS), None);
        let _ = fs::remove_dir_all(&dir);
    }
}
