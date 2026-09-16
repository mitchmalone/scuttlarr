//! scuttlarr updating itself (DECISIONS 2026-09-16):
//! the `scuttlarr` source in the `updates` plugin. The check reads the public
//! GitHub Releases feed — the same feed the site's `release.json` is cut from —
//! and sends nothing about the user (invariant 2: the request serves the user,
//! it does not report on them). The install downloads the release zip, checks
//! its sha256 against the release's `SHA256SUMS`, expands it, verifies the
//! bundle's signature against the *running* app's team with `codesign`, swaps
//! the bundle in place by two renames, and relaunches. Nothing is installed
//! unless every check passes; the running app survives any failure untouched.
//!
//! Never offered from a build that is not a signed `.app` — a `tauri dev` run
//! or an ad-hoc dev-install has no team to verify against.

use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;
use std::time::Duration;

use sha2::{Digest, Sha256};

use crate::updates::{UpdateItem, UpdateSource};

pub const SOURCE_ID: &str = "scuttlarr";
const RELEASES_LATEST: &str = "https://api.github.com/repos/mitchmalone/scuttlarr/releases/latest";
/// A release zip larger than this is refused rather than downloaded.
const MAX_ZIP_BYTES: u64 = 200 * 1024 * 1024;

static CHECK_ENABLED: AtomicBool = AtomicBool::new(true);

/// `config.updates.checkSelf` — off means no request is ever made.
pub fn configure(cfg: &crate::config::UpdatesConfig) {
    CHECK_ENABLED.store(cfg.check_self, Ordering::Relaxed);
}

/// The running bundle, when this process is one: `…/X.app/Contents/MacOS/x`.
fn bundle_path() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let bundle = exe.parent()?.parent()?.parent()?;
    (bundle.extension().and_then(|e| e.to_str()) == Some("app")).then(|| bundle.to_path_buf())
}

/// `TeamIdentifier=…` from `codesign -dv`; None for ad-hoc or unsigned code.
fn team_identifier(bundle: &Path) -> Option<String> {
    let out = Command::new("/usr/bin/codesign")
        .args(["-dv", "--verbose=2"])
        .arg(bundle)
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stderr);
    text.lines()
        .find_map(|l| l.strip_prefix("TeamIdentifier="))
        .map(str::trim)
        .filter(|t| !t.is_empty() && *t != "not set")
        .map(String::from)
}

struct Identity {
    bundle: PathBuf,
    bundle_id: String,
    version: String,
    team: String,
}

/// What we are, resolved once: the bundle, its id and version from Info.plist,
/// and the team it is signed by. None = self-update is unavailable here.
fn identity() -> Option<&'static Identity> {
    static ID: OnceLock<Option<Identity>> = OnceLock::new();
    ID.get_or_init(|| {
        let bundle = bundle_path()?;
        let (bundle_id, version) = plist_id_version(&bundle)?;
        let team = team_identifier(&bundle)?;
        Some(Identity {
            bundle,
            bundle_id,
            version,
            team,
        })
    })
    .as_ref()
}

fn plist_id_version(bundle: &Path) -> Option<(String, String)> {
    let value = plist::Value::from_file(bundle.join("Contents/Info.plist")).ok()?;
    let dict = value.as_dictionary()?;
    let get = |k: &str| dict.get(k).and_then(|v| v.as_string()).map(String::from);
    Some((
        get("CFBundleIdentifier")?,
        get("CFBundleShortVersionString")?,
    ))
}

/// Whether the `scuttlarr` source exists at all: a signed bundle, and the check on.
pub fn eligible() -> bool {
    CHECK_ENABLED.load(Ordering::Relaxed) && identity().is_some()
}

/// The terminal route for the same upgrade (`t` / `c` in the panel).
pub const UPGRADE_COMMAND: &str = "brew upgrade --cask scuttlarr";

fn agent() -> ureq::Agent {
    ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(6))
        .timeout(Duration::from_secs(30))
        // The app's name, nothing about the machine or the person.
        .user_agent("scuttlarr")
        .build()
}

pub struct Latest {
    pub version: String,
    pub zip_url: String,
    pub zip_name: String,
    pub sums_url: String,
}

/// The newest stable release's version and asset URLs, or why not.
fn latest(agent: &ureq::Agent) -> Result<Latest, String> {
    let response = agent
        .get(RELEASES_LATEST)
        .set("Accept", "application/vnd.github+json")
        .call()
        .map_err(|e| short_err(&e))?;
    let text = response.into_string().map_err(|e| e.to_string())?;
    let body: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    parse_latest(&body)
}

/// Pure: the parse of GitHub's `releases/latest` payload.
pub fn parse_latest(body: &serde_json::Value) -> Result<Latest, String> {
    let tag = body["tag_name"].as_str().ok_or("no tag_name in release")?;
    let version = tag.trim_start_matches('v').to_string();
    let zip_name = format!("scuttlarr-{version}.zip");
    let assets = body["assets"].as_array().ok_or("no assets in release")?;
    let url_of = |name: &str| {
        assets
            .iter()
            .find(|a| a["name"].as_str() == Some(name))
            .and_then(|a| a["browser_download_url"].as_str())
            .map(String::from)
    };
    let zip_url = url_of(&zip_name).ok_or_else(|| format!("release {tag} has no {zip_name}"))?;
    let sums_url =
        url_of("SHA256SUMS").ok_or_else(|| format!("release {tag} has no SHA256SUMS"))?;
    Ok(Latest {
        version,
        zip_url,
        zip_name,
        sums_url,
    })
}

/// `0.10.0` > `0.9.3`: dotted integers, missing parts are 0, anything after a
/// `-` (a pre-release tag) ignored. Pure.
pub fn is_newer(available: &str, installed: &str) -> bool {
    fn parts(v: &str) -> Vec<u64> {
        v.split('-')
            .next()
            .unwrap_or("")
            .split('.')
            .map(|p| p.parse().unwrap_or(0))
            .collect()
    }
    let (a, i) = (parts(available), parts(installed));
    for n in 0..a.len().max(i.len()) {
        let (x, y) = (*a.get(n).unwrap_or(&0), *i.get(n).unwrap_or(&0));
        if x != y {
            return x > y;
        }
    }
    false
}

/// One check: the `scuttlarr` row of the updates report. An error is the row's
/// `error`, exactly like a package manager's failed check.
pub fn check() -> UpdateSource {
    let mut source = UpdateSource {
        id: SOURCE_ID.into(),
        label: "scuttlarr".into(),
        upgrade_command: UPGRADE_COMMAND.into(),
        checked_at: now_secs(),
        error: None,
        items: Vec::new(),
    };
    let Some(id) = identity() else {
        source.error = Some("not an installed, signed build".into());
        return source;
    };
    match latest(&agent()) {
        Err(e) => source.error = Some(e),
        Ok(latest) => {
            if is_newer(&latest.version, &id.version) {
                source.items.push(UpdateItem {
                    name: "scuttlarr".into(),
                    installed: id.version.clone(),
                    available: latest.version,
                    kind: Some("app".into()),
                });
            }
        }
    }
    source
}

fn update_dir() -> Result<PathBuf, String> {
    let dir = dirs::cache_dir()
        .ok_or("no cache dir")?
        .join("scuttlarr")
        .join("update");
    fs::create_dir_all(&dir).map_err(|e| format!("create {}: {e}", dir.display()))?;
    Ok(dir)
}

/// Remove what a previous update left (its zip, its stage, the bundle it
/// replaced) — called at boot, once we are demonstrably running the new one.
pub fn cleanup() {
    if let Some(dir) = dirs::cache_dir().map(|d| d.join("scuttlarr").join("update")) {
        let _ = fs::remove_dir_all(dir);
    }
}

fn get_to_file(agent: &ureq::Agent, url: &str, dest: &Path) -> Result<u64, String> {
    let response = agent.get(url).call().map_err(|e| short_err(&e))?;
    let mut file = fs::File::create(dest).map_err(|e| e.to_string())?;
    let n = std::io::copy(
        &mut response.into_reader().take(MAX_ZIP_BYTES + 1),
        &mut file,
    )
    .map_err(|e| e.to_string())?;
    if n > MAX_ZIP_BYTES {
        return Err("release zip is implausibly large; refused".into());
    }
    Ok(n)
}

fn get_text(agent: &ureq::Agent, url: &str) -> Result<String, String> {
    agent
        .get(url)
        .call()
        .map_err(|e| short_err(&e))?
        .into_string()
        .map_err(|e| e.to_string())
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

/// The digest `SHA256SUMS` lists for `name` (`<hex>  <name>` per line). Pure.
pub fn sum_for(sums: &str, name: &str) -> Option<String> {
    sums.lines().find_map(|line| {
        let mut it = line.split_whitespace();
        let hex = it.next()?;
        let file = it.next()?.trim_start_matches('*');
        (file == name).then(|| hex.to_lowercase())
    })
}

/// `codesign --verify` against the running app's team: the download must be
/// intact, strictly valid, nested code included, and signed by *us*.
fn verify_signature(app: &Path, team: &str) -> Result<(), String> {
    let requirement = format!("anchor apple generic and certificate leaf[subject.OU] = \"{team}\"");
    let out = Command::new("/usr/bin/codesign")
        .args(["--verify", "--deep", "--strict", "-R", &requirement])
        .arg(app)
        .output()
        .map_err(|e| format!("codesign: {e}"))?;
    if out.status.success() {
        Ok(())
    } else {
        let msg = String::from_utf8_lossy(&out.stderr);
        Err(format!(
            "signature rejected: {}",
            msg.lines().last().unwrap_or("").trim()
        ))
    }
}

/// A download we made ourselves carries no quarantine flag; if one is there
/// anyway something else touched the file, and we refuse rather than strip it.
fn quarantined(path: &Path) -> bool {
    Command::new("/usr/bin/xattr")
        .args(["-p", "com.apple.quarantine"])
        .arg(path)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Download, verify, swap, relaunch. `progress` gets one line per step for the
/// panel's tail. On `Ok` the process is about to exit; the caller should not
/// touch state after it returns.
pub fn install(progress: &dyn Fn(String)) -> Result<(), String> {
    let id = identity().ok_or("not an installed, signed build")?;
    let agent = agent();
    let latest = latest(&agent)?;
    if !is_newer(&latest.version, &id.version) {
        return Err(format!("{} is already the newest release", id.version));
    }
    let dir = update_dir()?;
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    progress(format!("downloading {} …", latest.zip_name));
    let zip = dir.join(&latest.zip_name);
    let bytes = get_to_file(&agent, &latest.zip_url, &zip)?;
    progress(format!("{:.1} MB", bytes as f64 / 1_048_576.0));

    progress("checking sha256 …".into());
    let sums = get_text(&agent, &latest.sums_url)?;
    let expected = sum_for(&sums, &latest.zip_name)
        .ok_or_else(|| format!("SHA256SUMS has no line for {}", latest.zip_name))?;
    let actual = sha256_file(&zip)?;
    if actual != expected {
        return Err("sha256 mismatch: the download is not the released zip".into());
    }
    if quarantined(&zip) {
        return Err("the download carries a quarantine flag; refused".into());
    }

    progress("expanding …".into());
    let stage = dir.join("stage");
    fs::create_dir_all(&stage).map_err(|e| e.to_string())?;
    let out = Command::new("/usr/bin/ditto")
        .args(["-x", "-k"])
        .arg(&zip)
        .arg(&stage)
        .output()
        .map_err(|e| format!("ditto: {e}"))?;
    if !out.status.success() {
        return Err(format!(
            "ditto failed: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    let new_app = fs::read_dir(&stage)
        .map_err(|e| e.to_string())?
        .flatten()
        .map(|e| e.path())
        .find(|p| p.extension().and_then(|e| e.to_str()) == Some("app"))
        .ok_or("the zip holds no .app")?;

    progress("verifying signature …".into());
    let (new_id, new_version) = plist_id_version(&new_app).ok_or("new bundle has no Info.plist")?;
    if new_id != id.bundle_id {
        return Err(format!("bundle id mismatch: {new_id}"));
    }
    if new_version != latest.version {
        return Err(format!(
            "version mismatch: zip says {new_version}, release says {}",
            latest.version
        ));
    }
    verify_signature(&new_app, &id.team)?;
    progress(format!("signed by team {} · ok", id.team));

    progress(format!(
        "installing {} → {}",
        latest.version,
        id.bundle.display()
    ));
    swap_bundle(&id.bundle, &new_app, &dir)?;

    progress("relaunching …".into());
    crate::logbook::breadcrumb(
        "selfupdate",
        &format!(
            "installed {} over {} — relaunching",
            latest.version, id.version
        ),
    );
    relaunch(&id.bundle);
    Ok(())
}

/// Two renames: the running bundle aside (kept until the next boot's
/// `cleanup`, since the process may still page from it), the new one into its
/// place. `rename` across volumes fails, so the aside copy falls back to a
/// sibling path and the install to a `ditto` copy.
fn swap_bundle(installed: &Path, new_app: &Path, dir: &Path) -> Result<(), String> {
    let previous = dir.join("previous.app");
    let _ = fs::remove_dir_all(&previous);
    let aside = match fs::rename(installed, &previous) {
        Ok(()) => previous,
        Err(_) => {
            let sibling = installed.with_extension("app.previous");
            let _ = fs::remove_dir_all(&sibling);
            fs::rename(installed, &sibling)
                .map_err(|e| format!("move the installed app aside: {e}"))?;
            sibling
        }
    };
    if let Err(e) = fs::rename(new_app, installed) {
        // Same-volume rename failed: copy, then restore on any failure so the
        // user is never left without an app.
        let copied = Command::new("/usr/bin/ditto")
            .arg(new_app)
            .arg(installed)
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if !copied {
            let _ = fs::remove_dir_all(installed);
            let _ = fs::rename(&aside, installed);
            return Err(format!("install the new app: {e}"));
        }
    }
    Ok(())
}

/// `open -g` in a second, from a child that outlives us, then an orderly exit
/// — the same teardown `RunEvent::Exit` runs, so the supervised `borders`
/// child does not outlive the process.
fn relaunch(bundle: &Path) {
    let path = bundle.to_string_lossy().into_owned();
    let _ = Command::new("/bin/sh")
        .args(["-c", "sleep 1; /usr/bin/open -g \"$0\"", &path])
        .spawn();
    std::thread::sleep(Duration::from_millis(300));
    crate::desktop::shutdown();
    std::process::exit(0);
}

fn short_err(e: &ureq::Error) -> String {
    match e {
        ureq::Error::Status(code, _) => format!("HTTP {code}"),
        ureq::Error::Transport(t) => t
            .message()
            .map(String::from)
            .unwrap_or_else(|| "network error".into()),
    }
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_order() {
        assert!(is_newer("0.7.0", "0.6.0"));
        assert!(is_newer("0.10.0", "0.9.3"));
        assert!(is_newer("1.0.0", "0.99.99"));
        assert!(!is_newer("0.6.0", "0.6.0"));
        assert!(!is_newer("0.5.9", "0.6.0"));
        assert!(!is_newer("0.6.0-beta.1", "0.6.0"));
        assert!(is_newer("0.6.1", "0.6"));
    }

    #[test]
    fn parses_the_release_feed() {
        let body = serde_json::json!({
            "tag_name": "v0.7.0",
            "assets": [
                {"name": "scuttlarr-0.7.0.dmg", "browser_download_url": "https://x/d"},
                {"name": "scuttlarr-0.7.0.zip", "browser_download_url": "https://x/z"},
                {"name": "SHA256SUMS", "browser_download_url": "https://x/s"}
            ]
        });
        let l = parse_latest(&body).unwrap();
        assert_eq!(l.version, "0.7.0");
        assert_eq!(l.zip_name, "scuttlarr-0.7.0.zip");
        assert_eq!(l.zip_url, "https://x/z");
        assert_eq!(l.sums_url, "https://x/s");
        // A release without the zip is not installable and not offered.
        let no_zip = serde_json::json!({"tag_name": "v0.7.0", "assets": [
            {"name": "SHA256SUMS", "browser_download_url": "https://x/s"}]});
        assert!(parse_latest(&no_zip).is_err());
    }

    #[test]
    fn reads_the_sums_file() {
        let sums = "abc123  scuttlarr-0.7.0.zip\nDEF456  scuttlarr-0.7.0.dmg\n";
        assert_eq!(
            sum_for(sums, "scuttlarr-0.7.0.zip").as_deref(),
            Some("abc123")
        );
        assert_eq!(
            sum_for(sums, "scuttlarr-0.7.0.dmg").as_deref(),
            Some("def456")
        );
        assert_eq!(sum_for(sums, "other.zip"), None);
    }

    #[test]
    fn a_dev_build_is_never_eligible() {
        // cargo test runs from target/debug/deps, not a bundle.
        assert!(bundle_path().is_none());
        assert!(!eligible());
    }
}
