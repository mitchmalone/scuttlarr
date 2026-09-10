//! Privacy permissions a plugin may declare (`manifest.permissions`), and what
//! launcharr can learn or do about each: is the usage string in our bundle,
//! what does TCC currently say, can we make macOS ask now, and where in
//! System Settings the user flips it (DECISIONS 2026-09-10 ×2).
//!
//! macOS judges a child process by the *responsible* app — launcharr.app —
//! and kills it with no prompt when that app's Info.plist lacks the usage
//! string. So the strings ship in the bundle for every class listed here,
//! nothing prompts until code touches the API, and the plugin supervisor
//! asks before a service runs so the prompt arrives at a predictable moment.
//!
//! Raw `msg_send!` lives only here; each call has its safety note.

use std::ffi::CStr;
use std::path::PathBuf;
use std::sync::Mutex;

use block2::RcBlock;
use objc2::runtime::{AnyClass, AnyObject, Bool};
use objc2_foundation::NSString;
use serde::{Deserialize, Serialize};

// Linking the frameworks makes their classes resolvable by name at run time.
#[link(name = "CoreBluetooth", kind = "framework")]
extern "C" {}
#[link(name = "AVFoundation", kind = "framework")]
extern "C" {}
#[link(name = "CoreLocation", kind = "framework")]
extern "C" {}
#[link(name = "Contacts", kind = "framework")]
extern "C" {}
#[link(name = "EventKit", kind = "framework")]
extern "C" {}
#[link(name = "Photos", kind = "framework")]
extern "C" {}

/// A privacy class a plugin can declare. Names are the manifest vocabulary.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Permission {
    Bluetooth,
    Camera,
    Microphone,
    Location,
    Contacts,
    Calendars,
    Reminders,
    Photos,
    LocalNetwork,
}

pub const ALL: [Permission; 9] = [
    Permission::Bluetooth,
    Permission::Camera,
    Permission::Microphone,
    Permission::Location,
    Permission::Contacts,
    Permission::Calendars,
    Permission::Reminders,
    Permission::Photos,
    Permission::LocalNetwork,
];

/// What TCC says right now.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Status {
    Granted,
    Denied,
    /// macOS has not asked yet; `request` makes it.
    NotDetermined,
    /// This build's Info.plist lacks the usage string — the service would be
    /// killed on first use. Only a stale build can get here.
    MissingUsageString,
    /// No query API (local network), or not running from a bundle (dev).
    Unknown,
}

/// One declared permission as every surface sees it (mirrors `PluginPermission` in TS).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct PluginPermission {
    pub name: Permission,
    pub label: String,
    pub status: Status,
    /// What the user can do about a non-granted one, if anything.
    pub fix: Option<String>,
}

impl Permission {
    pub fn parse(s: &str) -> Option<Self> {
        ALL.into_iter().find(|p| p.name() == s)
    }

    pub fn name(self) -> &'static str {
        match self {
            Self::Bluetooth => "bluetooth",
            Self::Camera => "camera",
            Self::Microphone => "microphone",
            Self::Location => "location",
            Self::Contacts => "contacts",
            Self::Calendars => "calendars",
            Self::Reminders => "reminders",
            Self::Photos => "photos",
            Self::LocalNetwork => "local-network",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Bluetooth => "Bluetooth",
            Self::Camera => "Camera",
            Self::Microphone => "Microphone",
            Self::Location => "Location",
            Self::Contacts => "Contacts",
            Self::Calendars => "Calendars",
            Self::Reminders => "Reminders",
            Self::Photos => "Photos",
            Self::LocalNetwork => "Local network",
        }
    }

    /// Info.plist keys that must carry a string. Calendars/Reminders need
    /// both the pre-14 and the 14+ key.
    pub fn usage_keys(self) -> &'static [&'static str] {
        match self {
            Self::Bluetooth => &["NSBluetoothAlwaysUsageDescription"],
            Self::Camera => &["NSCameraUsageDescription"],
            Self::Microphone => &["NSMicrophoneUsageDescription"],
            Self::Location => &["NSLocationUsageDescription"],
            Self::Contacts => &["NSContactsUsageDescription"],
            Self::Calendars => &[
                "NSCalendarsUsageDescription",
                "NSCalendarsFullAccessUsageDescription",
            ],
            Self::Reminders => &[
                "NSRemindersUsageDescription",
                "NSRemindersFullAccessUsageDescription",
            ],
            Self::Photos => &["NSPhotoLibraryUsageDescription"],
            Self::LocalNetwork => &["NSLocalNetworkUsageDescription"],
        }
    }

    /// The System Settings → Privacy & Security pane for this class.
    pub fn settings_url(self) -> String {
        let anchor = match self {
            Self::Bluetooth => "Privacy_Bluetooth",
            Self::Camera => "Privacy_Camera",
            Self::Microphone => "Privacy_Microphone",
            Self::Location => "Privacy_LocationServices",
            Self::Contacts => "Privacy_Contacts",
            Self::Calendars => "Privacy_Calendars",
            Self::Reminders => "Privacy_Reminders",
            Self::Photos => "Privacy_Photos",
            Self::LocalNetwork => "Privacy_LocalNetwork",
        };
        format!("x-apple.systempreferences:com.apple.preference.security?{anchor}")
    }
}

/// Parse a manifest's `permissions`; unknown names are the error.
pub fn parse_list(names: &[String]) -> Result<Vec<Permission>, String> {
    let mut out = Vec::new();
    for n in names {
        match Permission::parse(n) {
            Some(p) if !out.contains(&p) => out.push(p),
            Some(_) => {}
            None => {
                return Err(format!(
                    "unknown permission `{n}` (known: {})",
                    ALL.map(Permission::name).join(", ")
                ))
            }
        }
    }
    Ok(out)
}

// ---- the bundle ----------------------------------------------------------

/// `Contents/Info.plist` of the bundle we run from; None outside a bundle
/// (`tauri dev`), where TCC judges the terminal instead.
fn bundle_info_plist() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let contents = exe.parent()?.parent()?;
    let plist = contents.join("Info.plist");
    (contents.file_name()? == "Contents" && plist.is_file()).then_some(plist)
}

/// Usage-string keys present in our bundle; None when not in a bundle.
fn bundle_usage_keys() -> Option<Vec<String>> {
    let path = bundle_info_plist()?;
    let dict = plist::Value::from_file(path).ok()?.into_dictionary()?;
    Some(
        dict.into_iter()
            .filter(|(k, v)| {
                k.ends_with("UsageDescription") && v.as_string().is_some_and(|s| !s.is_empty())
            })
            .map(|(k, _)| k)
            .collect(),
    )
}

pub fn has_usage_string(p: Permission, present: &[String]) -> bool {
    p.usage_keys()
        .iter()
        .all(|k| present.iter().any(|have| have == k))
}

// ---- TCC state -----------------------------------------------------------

fn class(name: &CStr) -> Option<&'static AnyClass> {
    AnyClass::get(name)
}

/// Map the 0/1/2/3(+) authorization enums every framework shares:
/// notDetermined, restricted, denied, authorized (and 4 = limited/when-in-use,
/// which is still access).
fn map_auth(v: isize) -> Status {
    match v {
        0 => Status::NotDetermined,
        1 | 2 => Status::Denied,
        3 | 4 => Status::Granted,
        _ => Status::Unknown,
    }
}

fn media_status(kind: &str) -> Status {
    let Some(cls) = class(c"AVCaptureDevice") else {
        return Status::Unknown;
    };
    let media = NSString::from_str(kind);
    // SAFETY: class method with one object argument, returns an NSInteger enum.
    let v: isize = unsafe { objc2::msg_send![cls, authorizationStatusForMediaType: &*media] };
    map_auth(v)
}

fn entity_status(class_name: &CStr, entity: isize) -> Status {
    let Some(cls) = class(class_name) else {
        return Status::Unknown;
    };
    // SAFETY: class method with one integer argument, returns an NSInteger enum.
    let v: isize = unsafe { objc2::msg_send![cls, authorizationStatusForEntityType: entity] };
    map_auth(v)
}

/// What macOS says about `p` for this app, ignoring the bundle question.
pub fn tcc_status(p: Permission) -> Status {
    match p {
        Permission::Bluetooth => match class(c"CBCentralManager") {
            // SAFETY: `+[CBCentralManager authorization]`, macOS 10.15+, returns CBManagerAuthorization.
            Some(cls) => map_auth(unsafe { objc2::msg_send![cls, authorization] }),
            None => Status::Unknown,
        },
        Permission::Camera => media_status("vide"),
        Permission::Microphone => media_status("soun"),
        Permission::Location => match class(c"CLLocationManager") {
            // SAFETY: `+[CLLocationManager authorizationStatus]` returns CLAuthorizationStatus
            // (0 notDetermined, 1 restricted, 2 denied, 3 always, 4 whenInUse).
            Some(cls) => map_auth(unsafe { objc2::msg_send![cls, authorizationStatus] }),
            None => Status::Unknown,
        },
        Permission::Contacts => entity_status(c"CNContactStore", 0),
        Permission::Calendars => entity_status(c"EKEventStore", 0),
        Permission::Reminders => entity_status(c"EKEventStore", 1),
        Permission::Photos => match class(c"PHPhotoLibrary") {
            // SAFETY: `+[PHPhotoLibrary authorizationStatusForAccessLevel:]`, 2 = readWrite.
            Some(cls) => map_auth(unsafe {
                objc2::msg_send![cls, authorizationStatusForAccessLevel: 2isize]
            }),
            None => Status::Unknown,
        },
        Permission::LocalNetwork => Status::Unknown,
    }
}

/// The full picture for `p`: the bundle first (a missing string is fatal
/// and only we can fix it), then TCC.
pub fn status(p: Permission) -> Status {
    if let Some(keys) = bundle_usage_keys() {
        if !has_usage_string(p, &keys) {
            return Status::MissingUsageString;
        }
    }
    tcc_status(p)
}

pub fn describe(p: Permission) -> PluginPermission {
    let status = status(p);
    let fix = match status {
        Status::Granted | Status::Unknown => None,
        Status::NotDetermined => Some("macOS will ask when the plugin starts".into()),
        Status::Denied => Some(format!(
            "allow launcharr in System Settings → Privacy & Security → {}",
            p.label()
        )),
        Status::MissingUsageString => Some(
            "this launcharr build cannot ask — rebuild from a source that ships the usage string"
                .into(),
        ),
    };
    PluginPermission {
        name: p,
        label: p.label().into(),
        status,
        fix,
    }
}

// ---- asking ---------------------------------------------------------------

/// Objects whose existence is the request (a CBCentralManager prompts on
/// init and stops mattering once TCC has an answer). Leaked on purpose.
static HELD: Mutex<Vec<usize>> = Mutex::new(Vec::new());

fn hold(obj: *mut AnyObject) {
    if !obj.is_null() {
        HELD.lock().unwrap().push(obj as usize);
    }
}

/// Make macOS show the prompt for `p` now, if it has not asked yet. Returns
/// false when this class has no way to ask (the plugin's own first use will).
/// The answer arrives asynchronously — poll `status`.
pub fn request(p: Permission) -> bool {
    if tcc_status(p) != Status::NotDetermined {
        return false;
    }
    match p {
        Permission::Bluetooth => {
            let Some(cls) = class(c"CBCentralManager") else {
                return false;
            };
            // SAFETY: alloc/init with nil delegate and queue; creating the manager
            // is what triggers TCC. Kept alive in HELD so the prompt is not torn down.
            unsafe {
                let obj: *mut AnyObject = objc2::msg_send![cls, alloc];
                let obj: *mut AnyObject = objc2::msg_send![
                    obj,
                    initWithDelegate: std::ptr::null_mut::<AnyObject>(),
                    queue: std::ptr::null_mut::<AnyObject>()
                ];
                hold(obj);
            }
            true
        }
        Permission::Camera | Permission::Microphone => {
            let Some(cls) = class(c"AVCaptureDevice") else {
                return false;
            };
            let media = NSString::from_str(if p == Permission::Camera {
                "vide"
            } else {
                "soun"
            });
            let block = RcBlock::new(|_granted: Bool| {});
            // SAFETY: class method; the block is copied by the framework and may run on any queue.
            unsafe {
                let _: () = objc2::msg_send![cls, requestAccessForMediaType: &*media, completionHandler: &*block];
            }
            true
        }
        Permission::Location => {
            let Some(cls) = class(c"CLLocationManager") else {
                return false;
            };
            // SAFETY: a manager with no delegate; requestAlwaysAuthorization prompts.
            // Held so the request is not cancelled by dealloc.
            unsafe {
                let obj: *mut AnyObject = objc2::msg_send![cls, new];
                if obj.is_null() {
                    return false;
                }
                let _: () = objc2::msg_send![obj, requestAlwaysAuthorization];
                hold(obj);
            }
            true
        }
        Permission::Contacts => {
            let Some(cls) = class(c"CNContactStore") else {
                return false;
            };
            let block = RcBlock::new(|_granted: Bool, _err: *mut AnyObject| {});
            // SAFETY: instance method on a fresh store; block copied by the framework.
            unsafe {
                let obj: *mut AnyObject = objc2::msg_send![cls, new];
                if obj.is_null() {
                    return false;
                }
                let _: () = objc2::msg_send![obj, requestAccessForEntityType: 0isize, completionHandler: &*block];
                hold(obj);
            }
            true
        }
        Permission::Calendars | Permission::Reminders => {
            let Some(cls) = class(c"EKEventStore") else {
                return false;
            };
            let entity: isize = if p == Permission::Calendars { 0 } else { 1 };
            let block = RcBlock::new(|_granted: Bool, _err: *mut AnyObject| {});
            // SAFETY: `-[EKEventStore requestAccessToEntityType:completion:]` (deprecated on 14,
            // still functional and prompts full access); block copied by the framework.
            unsafe {
                let obj: *mut AnyObject = objc2::msg_send![cls, new];
                if obj.is_null() {
                    return false;
                }
                let _: () =
                    objc2::msg_send![obj, requestAccessToEntityType: entity, completion: &*block];
                hold(obj);
            }
            true
        }
        Permission::Photos => {
            let Some(cls) = class(c"PHPhotoLibrary") else {
                return false;
            };
            let block = RcBlock::new(|_status: isize| {});
            // SAFETY: class method; 2 = readWrite; block copied by the framework.
            unsafe {
                let _: () = objc2::msg_send![cls, requestAuthorizationForAccessLevel: 2isize, handler: &*block];
            }
            true
        }
        Permission::LocalNetwork => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_round_trip() {
        for p in ALL {
            assert_eq!(Permission::parse(p.name()), Some(p));
        }
        assert_eq!(Permission::parse("wifi"), None);
    }

    #[test]
    fn parse_list_dedupes_and_rejects_unknown() {
        let ok = parse_list(&["bluetooth".into(), "camera".into(), "bluetooth".into()]).unwrap();
        assert_eq!(ok, vec![Permission::Bluetooth, Permission::Camera]);
        let err = parse_list(&["bluetooth".into(), "telepathy".into()]).unwrap_err();
        assert!(
            err.contains("telepathy") && err.contains("local-network"),
            "{err}"
        );
    }

    #[test]
    fn usage_string_needs_every_key() {
        let have = vec!["NSCalendarsUsageDescription".to_string()];
        assert!(!has_usage_string(Permission::Calendars, &have));
        let have = vec![
            "NSCalendarsUsageDescription".to_string(),
            "NSCalendarsFullAccessUsageDescription".to_string(),
        ];
        assert!(has_usage_string(Permission::Calendars, &have));
        assert!(!has_usage_string(Permission::Bluetooth, &have));
    }

    #[test]
    fn auth_enums_map() {
        assert_eq!(map_auth(0), Status::NotDetermined);
        assert_eq!(map_auth(1), Status::Denied);
        assert_eq!(map_auth(2), Status::Denied);
        assert_eq!(map_auth(3), Status::Granted);
        assert_eq!(map_auth(4), Status::Granted);
        assert_eq!(map_auth(9), Status::Unknown);
    }

    #[test]
    fn settings_urls_point_at_privacy() {
        for p in ALL {
            assert!(p
                .settings_url()
                .starts_with("x-apple.systempreferences:com.apple.preference.security?Privacy_"));
        }
    }
}
