//! Bang-mode / agent-jump hand-off to the configured terminal.
//!
//! Ghostty (the default, and the stack's only terminal — scuttlarr AGENTS)
//! has no AppleScript dictionary and no `+new-window` on macOS, and `open -na
//! Ghostty` while one is already running starts a second, unusable instance
//! (two processes, two menu bars — found 2026-09-04). So Ghostty is never
//! addressed directly: it's reached through whichever multiplexer its window
//! is already showing — herdr's socket, or tmux — and only opened fresh
//! (`open -na`) when no Ghostty process exists yet at all. `plan_ghostty` is
//! that decision as a pure function (docs/plans/active/ghostty-handoff.md);
//! `run_ghostty` is the thin, I/O-doing executor.
//!
//! iTerm2 and Terminal.app are unaffected: both keep the AppleScript hand-off
//! below, and both are still `effective_terminal`'s fallback chain if Ghostty
//! isn't installed.

use std::{path::Path, process::Command};

use crate::{
    config::Terminal,
    error::{CmdError, CmdResult},
};

/// AppleScript string literal escaping: backslashes and double quotes only. The command is
/// otherwise passed through verbatim — no shell parsing, no quoting games (PRD §4.4).
fn applescript_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

fn ghostty_installed() -> bool {
    Path::new("/Applications/Ghostty.app").exists()
        || dirs::home_dir().is_some_and(|h| h.join("Applications/Ghostty.app").exists())
}

/// Resolve the effective terminal: configured target, falling back when it isn't installed.
/// Ghostty → iTerm2 → Terminal.app; iTerm2 (chosen directly) → Terminal.app.
pub fn effective_terminal(configured: Terminal) -> Terminal {
    match configured {
        Terminal::Ghostty if ghostty_installed() => Terminal::Ghostty,
        Terminal::Ghostty if Path::new("/Applications/iTerm.app").exists() => Terminal::ITerm2,
        Terminal::Ghostty => Terminal::TerminalApp,
        Terminal::ITerm2 if Path::new("/Applications/iTerm.app").exists() => Terminal::ITerm2,
        Terminal::ITerm2 => Terminal::TerminalApp,
        t => t,
    }
}

/// Display name for the "raise a window with no tty to aim at" fallback and for breadcrumbs.
fn app_name(terminal: Terminal) -> &'static str {
    match terminal {
        Terminal::Ghostty => "Ghostty",
        Terminal::ITerm2 => "iTerm",
        Terminal::TerminalApp => "Terminal",
    }
}

// ---- Ghostty: the planner ------------------------------------------------

/// What's alive on this machine right now — the only inputs `plan_ghostty` needs.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct GhosttyProbe {
    /// herdr's default-session socket answered a ping.
    pub herdr_running: bool,
    /// One entry per attached tmux client. The focused one (terminal focus events
    /// reaching tmux) is the one the user is looking at; failing that, the highest
    /// `client_activity` is the one they last typed into.
    pub tmux_sessions: Vec<TmuxClient>,
    /// `pgrep -x ghostty` found a running process.
    pub ghostty_running: bool,
}

/// One attached tmux client, from `tmux list-clients`.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct TmuxClient {
    pub session: String,
    /// Unix seconds of the client's last input.
    pub activity: u64,
    /// `#{client_focused}` — set only while the terminal reports focus to tmux
    /// (`focus-events on`, tmux ≥ 3.2); never set means "unknown", not "unfocused".
    pub focused: bool,
}

/// The chosen route into Ghostty. Four ways in, tried in this order — see the module docs.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HandOff {
    /// herdr is running: create+focus a tab in its default workspace and run `command`
    /// there (over herdr's socket — `herdr::ghostty_handoff`).
    Herdr { command: Option<String> },
    /// A tmux client is attached: open a new window in the session it's watching.
    TmuxWindow {
        session: String,
        command: Option<String>,
    },
    /// No Ghostty process exists yet: the first `open -na` is safe.
    OpenNewInstance { command: Option<String> },
    /// Ghostty is running with neither multiplexer to reach into: raise it and copy
    /// `command` to the pasteboard — there is no way in, so this fails visibly.
    RaiseAndCopy { command: String },
}

/// Decide how to hand `command` to Ghostty. Pure: no I/O, no side effects — every branch
/// is a straight read of `probe`. Empty `command` collapses to `None` (or, for the last
/// route, an empty string the executor treats as "just raise, nothing to copy").
pub fn plan_ghostty(probe: &GhosttyProbe, command: &str) -> HandOff {
    let command_opt = (!command.is_empty()).then(|| command.to_owned());
    if probe.herdr_running {
        return HandOff::Herdr {
            command: command_opt,
        };
    }
    let focused = probe.tmux_sessions.iter().find(|c| c.focused);
    let recent = probe.tmux_sessions.iter().max_by_key(|c| c.activity);
    if let Some(client) = focused.or(recent) {
        return HandOff::TmuxWindow {
            session: client.session.clone(),
            command: command_opt,
        };
    }
    if !probe.ghostty_running {
        return HandOff::OpenNewInstance {
            command: command_opt,
        };
    }
    HandOff::RaiseAndCopy {
        command: command.to_owned(),
    }
}

// ---- Ghostty: probing the machine -----------------------------------------

fn probe_ghostty() -> GhosttyProbe {
    GhosttyProbe {
        herdr_running: crate::herdr::running(),
        tmux_sessions: tmux_clients(),
        ghostty_running: ghostty_running(),
    }
}

fn ghostty_running() -> bool {
    Command::new("/usr/bin/pgrep")
        .args(["-x", "ghostty"])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn tmux_clients() -> Vec<TmuxClient> {
    for bin in ["tmux", "/opt/homebrew/bin/tmux", "/usr/local/bin/tmux"] {
        if let Ok(out) = Command::new(bin)
            .args([
                "list-clients",
                "-F",
                "#{session_name} #{client_activity} #{client_focused}",
            ])
            .output()
        {
            if out.status.success() {
                return parse_tmux_clients(&String::from_utf8_lossy(&out.stdout));
            }
        }
    }
    Vec::new()
}

/// `tmux list-clients -F '#{session_name} #{client_activity} #{client_focused}'`
/// output: one client per line — session name, a unix-seconds activity timestamp,
/// then `1` when focused or nothing at all (tmux prints an unset flag as empty).
/// Splits from the right since tmux session names may themselves contain spaces.
fn parse_tmux_clients(out: &str) -> Vec<TmuxClient> {
    out.lines()
        .filter_map(|line| {
            let line = line.trim();
            let (rest, last) = line.rsplit_once(char::is_whitespace)?;
            // Trailing field is either the focus flag (then activity precedes it)
            // or, for a client with no focus flag, the activity itself.
            let (session, activity, focused) = match last {
                "1" => {
                    let (session, activity) = rest.rsplit_once(char::is_whitespace)?;
                    (session, activity, true)
                }
                _ => (rest, last, false),
            };
            Some(TmuxClient {
                session: session.to_owned(),
                activity: activity.trim().parse().ok()?,
                focused,
            })
        })
        .collect()
}

// ---- Ghostty: the executor -------------------------------------------------

/// The single argv element `tmux new-window` runs: the user's shell, interactive +
/// login (`-lic`), running `<command>; exec <shell> -l` — so PATH and friends come from
/// their rc files (the window otherwise inherits the accessory app's bare PATH:
/// `brew: not found`, JOURNAL 2026-09-10) and the window survives after the command
/// finishes instead of closing. `None` command → no argv at all, a plain
/// `tmux new-window` (empty bang = "just open a window").
fn tmux_window_command(command: Option<&str>, shell: &str) -> Option<String> {
    command.map(|c| {
        let inner = shell_single_quote(&format!("{c}; exec {shell} -l"));
        format!("exec {shell} -lic {inner}")
    })
}

/// Single-quote `s` for POSIX `sh` (tmux runs the argv through `sh -c`).
fn shell_single_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

/// `open -na Ghostty --args …` argv for starting the *first* Ghostty instance running
/// `command` in a login shell. Empty when there's nothing to run — a bare `open -na`.
fn open_new_instance_args(command: Option<&str>, shell: &str) -> Vec<String> {
    match command {
        None => Vec::new(),
        Some(c) => vec![
            "--args".into(),
            "-e".into(),
            shell.into(),
            "-lic".into(),
            format!("{c}; exec {shell} -l"),
        ],
    }
}

fn login_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into())
}

fn open_ghostty() -> CmdResult<()> {
    let ok = Command::new("/usr/bin/open")
        .args(["-a", "Ghostty"])
        .status()
        .map(|s| s.success())
        .unwrap_or(false);
    ok.then_some(())
        .ok_or_else(|| CmdError::Terminal("could not activate Ghostty".into()))
}

fn tmux_new_window(session: &str, command: Option<&str>) -> CmdResult<()> {
    let shell = login_shell();
    let argv = tmux_window_command(command, &shell);
    for bin in ["tmux", "/opt/homebrew/bin/tmux", "/usr/local/bin/tmux"] {
        let mut cmd = Command::new(bin);
        cmd.args(["new-window", "-t", session]);
        if let Some(argv) = &argv {
            cmd.arg(argv);
        }
        if let Ok(status) = cmd.status() {
            return status
                .success()
                .then_some(())
                .ok_or_else(|| CmdError::Terminal("tmux new-window failed".into()));
        }
    }
    Err(CmdError::Terminal("tmux not found".into()))
}

fn open_new_ghostty_instance(command: Option<&str>) -> CmdResult<()> {
    let shell = login_shell();
    let ok = Command::new("/usr/bin/open")
        .args(["-na", "Ghostty"])
        .args(open_new_instance_args(command, &shell))
        .status()
        .map(|s| s.success())
        .unwrap_or(false);
    ok.then_some(())
        .ok_or_else(|| CmdError::Terminal("could not open Ghostty".into()))
}

/// Fire-and-forget Ghostty hand-off: probe the machine, plan the route, run it.
/// `new_window` (the bang "reuse current session" preference) doesn't apply here — every
/// route opens a new tmux window / herdr tab / Ghostty window; there is no in-place
/// "current session" for Ghostty to reuse (plan: docs/plans/active/ghostty-handoff.md).
fn run_ghostty(command: &str) -> CmdResult<()> {
    let probe = probe_ghostty();
    match plan_ghostty(&probe, command) {
        HandOff::Herdr { command } => {
            crate::herdr::ghostty_handoff(command.as_deref()).map_err(CmdError::Terminal)?;
            open_ghostty()
        }
        HandOff::TmuxWindow { session, command } => {
            tmux_new_window(&session, command.as_deref())?;
            open_ghostty()
        }
        HandOff::OpenNewInstance { command } => open_new_ghostty_instance(command.as_deref()),
        HandOff::RaiseAndCopy { command } => {
            open_ghostty()?;
            if command.is_empty() {
                return Ok(());
            }
            crate::clipboard::set_string(&command);
            Err(CmdError::Terminal(
                "Ghostty is open without tmux or herdr — command copied, paste it".into(),
            ))
        }
    }
}

/// Build the AppleScript for a bang-mode hand-off. Empty command = just open a window.
pub fn script_for(terminal: Terminal, command: &str, new_window: bool) -> String {
    let escaped = applescript_escape(command);
    match terminal {
        // Ghostty has no AppleScript dictionary and never reaches this function — `run`
        // routes it through `run_ghostty` before a script would be built. Kept only so
        // the match stays exhaustive over `Terminal`.
        Terminal::Ghostty => String::new(),
        Terminal::ITerm2 => {
            let write = if escaped.is_empty() {
                String::new()
            } else {
                format!("\n        write text \"{escaped}\"")
            };
            if new_window {
                format!(
                    r#"tell application id "com.googlecode.iterm2"
    activate
    set newWindow to (create window with default profile)
    tell current session of newWindow{write}
    end tell
end tell"#
                )
            } else {
                format!(
                    r#"tell application id "com.googlecode.iterm2"
    activate
    if (count of windows) = 0 then
        create window with default profile
    end if
    tell current session of current window{write}
    end tell
end tell"#
                )
            }
        }
        Terminal::TerminalApp => {
            if escaped.is_empty() {
                r#"tell application id "com.apple.Terminal"
    activate
    do script ""
end tell"#
                    .to_string()
            } else {
                format!(
                    r#"tell application id "com.apple.Terminal"
    activate
    do script "{escaped}"
end tell"#
                )
            }
        }
    }
}

/// Build the AppleScript that raises the window/tab whose shell is on `tty`.
///
/// Activating the app is not enough once more than one terminal window is open:
/// `open -a iTerm` raises whichever window happened to be frontmost, so a jump
/// into a tmux pane could surface a completely unrelated window — a herdr one,
/// say (field report 2026-08-18). The tty is the one identifier shared by the
/// multiplexer's client and the terminal session hosting it, so it's what we
/// aim at. Terminal.app addresses its windows by tty directly; iTerm2 needs the
/// walk. Failing to find it is fine — the app still comes forward.
pub fn script_for_tty(terminal: Terminal, tty: &str) -> String {
    let tty = applescript_escape(tty);
    match terminal {
        // Ghostty never reaches this either — `raise_tty` handles it directly (Ghostty
        // can't address a window by tty, AppleScript or otherwise).
        Terminal::Ghostty => String::new(),
        Terminal::ITerm2 => format!(
            r#"tell application id "com.googlecode.iterm2"
    activate
    repeat with w in windows
        repeat with t in tabs of w
            repeat with s in sessions of t
                if tty of s is "{tty}" then
                    select w
                    select t
                    select s
                    return
                end if
            end repeat
        end repeat
    end repeat
end tell"#
        ),
        Terminal::TerminalApp => format!(
            r#"tell application id "com.apple.Terminal"
    activate
    repeat with w in windows
        repeat with t in tabs of w
            if tty of t is "{tty}" then
                set frontmost of w to true
                set selected of t to true
                return
            end if
        end repeat
    end repeat
end tell"#
        ),
    }
}

/// Bring the terminal forward, aimed at `tty` when we know one. Blocking, and
/// deliberately so: the caller is a jump, and the pane selection underneath it
/// has already happened — racing the raise would land on the old view.
pub fn raise_tty(configured: Terminal, tty: Option<&str>) -> CmdResult<()> {
    let terminal = effective_terminal(configured);
    // Ghostty can't address a window by tty (no AppleScript dictionary); tmux/herdr have
    // already selected the pane by the time this runs, and Mitch runs one window per
    // multiplexer, so simply raising the app is the whole job.
    if terminal == Terminal::Ghostty {
        return open_ghostty();
    }
    let Some(tty) = tty.filter(|t| !t.is_empty()) else {
        let app = app_name(terminal);
        let ok = Command::new("/usr/bin/open")
            .args(["-a", app])
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        return ok
            .then_some(())
            .ok_or_else(|| CmdError::Terminal(format!("could not activate {app}")));
    };
    Command::new("osascript")
        .arg("-e")
        .arg(script_for_tty(terminal, tty))
        .status()
        .map_err(|e| CmdError::Terminal(e.to_string()))?;
    Ok(())
}

/// Fire-and-forget hand-off. The terminal owns output, interactivity, and lifetime from here.
pub fn run(configured: Terminal, command: &str, new_window: bool) -> CmdResult<()> {
    let terminal = effective_terminal(configured);
    if terminal == Terminal::Ghostty {
        return run_ghostty(command);
    }
    let script = script_for(terminal, command, new_window);
    // Spawn, don't wait: the first run triggers macOS's Automation consent prompt, which
    // blocks osascript until the user answers. launcharr must dismiss immediately (PRD §4.4).
    Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .spawn()
        .map_err(|e| CmdError::Terminal(e.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tty_script_aims_at_the_session_hosting_it() {
        let script = script_for_tty(Terminal::ITerm2, "/dev/ttys002");
        assert!(script.contains(r#"if tty of s is "/dev/ttys002""#));
        assert!(script.contains("select s"));
        let terminal_app = script_for_tty(Terminal::TerminalApp, "/dev/ttys002");
        assert!(terminal_app.contains(r#"if tty of t is "/dev/ttys002""#));
    }

    #[test]
    fn escapes_quotes_and_backslashes() {
        assert_eq!(
            applescript_escape(r#"echo "hi \ there""#),
            r#"echo \"hi \\ there\""#
        );
    }

    #[test]
    fn command_passed_verbatim_inside_script() {
        let script = script_for(Terminal::ITerm2, "git status && ls -la | head", true);
        assert!(script.contains(r#"write text "git status && ls -la | head""#));
        assert!(script.contains("create window with default profile"));
    }

    #[test]
    fn empty_command_opens_window_without_write() {
        let script = script_for(Terminal::ITerm2, "", true);
        assert!(!script.contains("write text"));
        assert!(script.contains("create window with default profile"));
    }

    #[test]
    fn reuse_session_script_targets_current_window() {
        let script = script_for(Terminal::ITerm2, "pwd", false);
        assert!(script.contains("current session of current window"));
        assert!(script.contains(r#"write text "pwd""#));
    }

    #[test]
    fn terminal_app_uses_do_script() {
        let script = script_for(Terminal::TerminalApp, "echo hi", true);
        assert!(script.contains(r#"do script "echo hi""#));
        assert!(script.contains("com.apple.Terminal"));
    }

    // ---- Ghostty planner ---------------------------------------------------

    fn probe(herdr: bool, tmux: &[(&str, u64)], ghostty: bool) -> GhosttyProbe {
        GhosttyProbe {
            herdr_running: herdr,
            tmux_sessions: tmux
                .iter()
                .map(|(s, a)| TmuxClient {
                    session: s.to_string(),
                    activity: *a,
                    focused: false,
                })
                .collect(),
            ghostty_running: ghostty,
        }
    }

    #[test]
    fn route2_focused_tmux_client_beats_a_more_recently_active_one() {
        let mut p = probe(false, &[("gogogo", 100), ("psyke", 200)], true);
        p.tmux_sessions[0].focused = true;
        assert_eq!(
            plan_ghostty(&p, "brew upgrade"),
            HandOff::TmuxWindow {
                session: "gogogo".into(),
                command: Some("brew upgrade".into()),
            }
        );
    }

    #[test]
    fn route1_herdr_running_wins_over_everything_else() {
        let p = probe(true, &[("gogogo", 100)], true);
        assert_eq!(
            plan_ghostty(&p, "echo hi"),
            HandOff::Herdr {
                command: Some("echo hi".into())
            }
        );
    }

    #[test]
    fn route2_tmux_client_picks_the_most_recently_active_session() {
        let p = probe(false, &[("old", 10), ("gogogo", 999), ("mid", 500)], true);
        assert_eq!(
            plan_ghostty(&p, "ls"),
            HandOff::TmuxWindow {
                session: "gogogo".into(),
                command: Some("ls".into())
            }
        );
    }

    #[test]
    fn route3_no_ghostty_process_opens_a_fresh_instance() {
        let p = probe(false, &[], false);
        assert_eq!(
            plan_ghostty(&p, "ls"),
            HandOff::OpenNewInstance {
                command: Some("ls".into())
            }
        );
    }

    #[test]
    fn route4_ghostty_running_with_no_multiplexer_raises_and_copies() {
        let p = probe(false, &[], true);
        assert_eq!(
            plan_ghostty(&p, "ls"),
            HandOff::RaiseAndCopy {
                command: "ls".into()
            }
        );
    }

    #[test]
    fn empty_command_collapses_to_none_on_every_route_but_the_last() {
        assert_eq!(
            plan_ghostty(&probe(true, &[], false), ""),
            HandOff::Herdr { command: None }
        );
        assert_eq!(
            plan_ghostty(&probe(false, &[("gogogo", 1)], false), ""),
            HandOff::TmuxWindow {
                session: "gogogo".into(),
                command: None
            }
        );
        assert_eq!(
            plan_ghostty(&probe(false, &[], false), ""),
            HandOff::OpenNewInstance { command: None }
        );
        // Route 4 keeps the raw (empty) string — the executor treats an empty copy as
        // "nothing to hand off", not an error.
        assert_eq!(
            plan_ghostty(&probe(false, &[], true), ""),
            HandOff::RaiseAndCopy {
                command: String::new()
            }
        );
    }

    #[test]
    fn parses_tmux_client_lines_into_session_activity_pairs() {
        // Real `tmux list-clients -F '#{session_name} #{client_activity}
        // #{client_focused}'` output — one client per line, session then a
        // unix-seconds timestamp, then `1` or nothing (unset flag prints empty).
        let out = "gogogo 1788490699 1\nother-session 1000\nmy session 5 \n";
        let client = |s: &str, a: u64, f: bool| TmuxClient {
            session: s.into(),
            activity: a,
            focused: f,
        };
        assert_eq!(
            parse_tmux_clients(out),
            vec![
                client("gogogo", 1788490699, true),
                client("other-session", 1000, false),
                client("my session", 5, false),
            ]
        );
        assert_eq!(parse_tmux_clients(""), Vec::new());
        assert_eq!(parse_tmux_clients("garbage-no-activity"), Vec::new());
    }

    #[test]
    fn tmux_window_command_appends_a_login_shell_so_the_window_survives() {
        assert_eq!(
            tmux_window_command(Some("echo hi"), "/bin/zsh").as_deref(),
            Some("exec /bin/zsh -lic 'echo hi; exec /bin/zsh -l'")
        );
        // A single quote inside the command survives sh's quoting rules.
        assert_eq!(
            tmux_window_command(Some("echo 'x'"), "/bin/zsh").as_deref(),
            Some("exec /bin/zsh -lic 'echo '\\''x'\\''; exec /bin/zsh -l'")
        );
        assert_eq!(tmux_window_command(None, "/bin/zsh"), None);
    }

    #[test]
    fn open_new_instance_args_wrap_the_command_in_a_login_shell() {
        assert_eq!(
            open_new_instance_args(Some("echo hi"), "/bin/zsh"),
            vec![
                "--args",
                "-e",
                "/bin/zsh",
                "-lic",
                "echo hi; exec /bin/zsh -l"
            ]
        );
        assert!(open_new_instance_args(None, "/bin/zsh").is_empty());
    }
}
