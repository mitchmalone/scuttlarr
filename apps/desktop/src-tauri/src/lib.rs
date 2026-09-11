// tauri-nspanel's event macro grammar requires an explicit `-> ()`; the lint can't be
// scoped to the macro invocation, so it's allowed crate-wide.
#![allow(clippy::unused_unit)]

use std::{
    path::PathBuf,
    sync::{Mutex, RwLock},
};

use rusqlite::Connection;
use tauri::Manager;
use tauri_plugin_global_shortcut::ShortcutState;

mod activation;
mod agents;
mod ask;
mod audio;
mod bar;
mod bar_constrain;
mod bar_modules;
mod battery;
mod bookmarks;
mod clipboard;
mod colorpicker;
mod commands;
mod config;
mod coreaudio;
mod corewlan;
mod deps;
mod desktop;
mod error;
mod favicon;
mod frecency;
mod herdr;
mod hooks;
mod icons;
mod indexer;
mod logbook;
mod loupe;
mod panel;
mod permissions;
mod plugins;
mod power;
mod rename;
mod runtime;
mod screens;
mod screenshots;
mod scripts;
mod settings_panes;
mod settings_window;
mod shortcut;
mod sysread;
mod system_commands;
mod terminal;
mod tray;
mod updates;
mod usage;
mod widget_secrets;
mod widgets;
mod wifi;

/// `--extract-icons <dir>` child-process entry (see icons.rs for why this exists).
pub fn extract_icons_cli(icon_dir: &std::path::Path) {
    icons::extract_cli(icon_dir);
}

/// Sync the login-item registration with config. Failure is logged, never fatal — a broken
/// LaunchAgent must not stop the launcher from launching things.
pub(crate) fn apply_launch_at_login(app: &tauri::AppHandle, enabled: bool) {
    use tauri_plugin_autostart::ManagerExt;
    let autolaunch = app.autolaunch();
    let result = if enabled {
        autolaunch.enable()
    } else {
        autolaunch.disable()
    };
    if let Err(e) = result {
        eprintln!("[scuttlarr] launch-at-login ({enabled}) failed: {e}");
    }
}

pub struct AppState {
    pub config: RwLock<config::Config>,
    pub index: RwLock<Vec<indexer::IndexItem>>,
    pub db: Mutex<Connection>,
    pub icon_dir: PathBuf,
    pub thumb_dir: PathBuf,
    pub scripts: RwLock<Vec<scripts::ScriptInfo>>,
    pub summon: RwLock<tauri_plugin_global_shortcut::Shortcut>,
    pub custom_shortcuts: RwLock<Vec<shortcut::CustomShortcut>>,
}

pub fn run() {
    let boot = std::time::Instant::now();
    tauri::Builder::default()
        .plugin(tauri_nspanel::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, pressed, event| {
                    if event.state() == ShortcutState::Pressed {
                        shortcut::handle(app, pressed);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::get_index,
            commands::get_frecency,
            commands::read_config,
            commands::open_path,
            commands::hide_panel,
            commands::bar_snapshot,
            commands::bar_switch_workspace,
            commands::bar_set_dropdown,
            commands::bar_battery_detail,
            commands::agents_status,
            commands::awake_arm,
            commands::awake_release,
            commands::awake_status,
            commands::awake_readings,
            ask::ask,
            commands::agent_jump,
            commands::agent_forget,
            commands::hooks_status,
            commands::hooks_install,
            commands::desktop_status,
            commands::desktop_apply,
            commands::desktop_adopt,
            commands::desktop_toml,
            commands::desktop_install,
            commands::desktop_corner_radius,
            commands::aerospace_workspaces,
            commands::aerospace_action,
            commands::wifi_status,
            commands::wifi_known_networks,
            commands::wifi_connect,
            commands::wifi_set_power,
            commands::wifi_scan,
            commands::audio_status,
            commands::audio_set_volume,
            commands::audio_set_muted,
            commands::audio_set_default,
            commands::resize_panel,
            commands::reindex,
            commands::execute,
            commands::run_bang,
            commands::get_scripts,
            commands::run_script,
            commands::script_action,
            commands::get_clips,
            commands::copy_clip,
            commands::clear_clips,
            commands::copy_text,
            commands::loupe_capture,
            commands::loupe_done,
            commands::open_url,
            commands::add_quicklink,
            commands::reveal_item,
            commands::delete_clip,
            commands::write_config,
            commands::open_settings,
            commands::open_panel,
            commands::list_screenshots,
            commands::screenshot_thumb,
            commands::screenshot_action,
            commands::widget_install,
            commands::widget_remove,
            commands::widget_tick,
            commands::widget_secret_set,
            commands::widget_secret_keys,
            commands::widget_auth,
            commands::widget_auth_cancel,
            commands::plugins_list,
            commands::plugin_state,
            commands::plugin_module,
            commands::plugin_send,
            commands::plugin_install,
            commands::plugin_remove,
            commands::plugin_restart,
            commands::plugin_permission_fix,
        ])
        .setup(move |app| {
            // No Dock icon, no menu bar: scuttlarr is an accessory (PRD §6.2).
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // launcharr → scuttlarr paths, once, before anything reads them (rename.rs).
            rename::boot();
            let (cfg, first_run) = config::load_or_create()?;

            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db = frecency::open(&data_dir.join("scuttlarr.db"))?;
            clipboard::init_table(&db)?;

            app.manage(AppState {
                config: RwLock::new(cfg.clone()),
                index: RwLock::new(Vec::new()),
                db: Mutex::new(db),
                icon_dir: data_dir.join("icons"),
                thumb_dir: data_dir.join("thumbs"),
                scripts: RwLock::new(Vec::new()),
                summon: RwLock::new("Alt+Space".parse().expect("default hotkey parses")),
                custom_shortcuts: RwLock::new(Vec::new()),
            });

            panel::init(app.handle())?;
            if cfg.bar.enabled {
                // Deferred like the first-run hint: monitor enumeration and
                // panel ordering want a live event loop, not mid-setup state.
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    let inner = handle.clone();
                    let _ = handle.run_on_main_thread(move || {
                        if let Err(e) = bar::init(&inner) {
                            eprintln!("[scuttlarr bar] init failed: {e:?}");
                        }
                    });
                });
            }
            agents::configure(&cfg.agents);
            usage::configure(&cfg.agents);
            agents::start(app.handle().clone());
            if cfg.agents.monitor {
                // Keep the Claude hook adapter installed at its stable path and
                // mend our own stale registrations (hooks.rs); adds nothing.
                std::thread::spawn(hooks::boot);
            }
            tray::init(app.handle())?;
            shortcut::sync(app.handle(), &cfg);
            indexer::start(app.handle().clone());
            scripts::start(app.handle().clone());
            // Plugins run bar or no bar: their panels live in the launcher too.
            plugins::start(app.handle().clone(), &cfg.plugins.disabled);
            // Warms the updates cache; the `updates` plugin ships on
            // (DECISIONS 2026-09-04), so the panel isn't empty on first open.
            updates::start();
            clipboard::watch(app.handle().clone());
            config::watch(app.handle().clone());
            apply_launch_at_login(app.handle(), cfg.launch_at_login);

            // §7 budget: cold start → hotkey registered < 1s.
            eprintln!(
                "[scuttlarr perf] cold start {}ms",
                boot.elapsed().as_millis()
            );

            // A keep-awake hold the previous run left behind (awake.json) is
            // re-armed now — assertions first, then a toast once the webview
            // can render it, so a resumed hold never goes unannounced.
            if let Some(resumed) = power::resume() {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(1500));
                    let text = power::resume_toast(&resumed);
                    let inner = handle.clone();
                    let _ = handle.run_on_main_thread(move || panel::flash(&inner, &text));
                });
            }

            // First run: show the panel once with the hint line (PRD §4.5). Delayed so the
            // webview has rendered by the time the panel appears.
            if first_run {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(800));
                    let inner = handle.clone();
                    // AppKit calls belong on the main thread.
                    let _ = handle.run_on_main_thread(move || panel::show(&inner));
                });
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building scuttlarr")
        .run(|_app, event| {
            // Orderly quit takes the supervised `borders` child with us (desktop.rs).
            if let tauri::RunEvent::Exit = event {
                desktop::shutdown();
            }
        });
}
