//! Start a persistent, read-only Codex chat and open it in the desktop app.
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::process::{Child, ChildStdin, Command, Stdio};

use serde_json::{json, Value};

fn turn_start(thread_id: &str, prompt: &str) -> Value {
    json!({"id":3,"method":"turn/start","params":{
        "threadId":thread_id,"input":[{"type":"text","text":prompt}]
    }})
}

fn thread_url(response: &Value) -> Result<String, String> {
    let id = response
        .pointer("/result/thread/id")
        .and_then(Value::as_str)
        .ok_or("Codex did not return a thread id")?;
    let valid = id.len() == 36
        && id.chars().enumerate().all(|(i, c)| {
            if [8, 13, 18, 23].contains(&i) {
                c == '-'
            } else {
                c.is_ascii_hexdigit()
            }
        });
    if !valid {
        return Err("Codex returned an invalid thread id".into());
    }
    Ok(format!("codex://threads/{id}"))
}

fn write_request(stdin: &mut ChildStdin, value: Value) -> Result<(), String> {
    serde_json::to_writer(&mut *stdin, &value).map_err(|e| e.to_string())?;
    stdin.write_all(b"\n").map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())
}

fn response(reader: &mut impl BufRead, id: u64) -> Result<Value, String> {
    let mut line = String::new();
    loop {
        line.clear();
        if reader.read_line(&mut line).map_err(|e| e.to_string())? == 0 {
            return Err(format!("Codex app-server closed before response {id}"));
        }
        let value: Value =
            serde_json::from_str(&line).map_err(|e| format!("Codex protocol: {e}"))?;
        if value.get("id").and_then(Value::as_u64) != Some(id) {
            continue;
        }
        if let Some(error) = value.get("error") {
            return Err(format!("Codex: {error}"));
        }
        return Ok(value);
    }
}

fn start(
    bin: &str,
    cage: &Path,
    prompt: &str,
) -> Result<(Child, BufReader<std::process::ChildStdout>, String), String> {
    let mut child = Command::new(bin)
        .args(["app-server", "--listen", "stdio://"])
        .current_dir(cage)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Start Codex: {e}"))?;
    let result = (|| {
        let mut stdin = child.stdin.take().ok_or("Codex stdin unavailable")?;
        let stdout = child.stdout.take().ok_or("Codex stdout unavailable")?;
        let mut reader = BufReader::new(stdout);
        write_request(
            &mut stdin,
            json!({"id":1,"method":"initialize","params":{
                "clientInfo":{"name":"scuttlarr","title":"scuttlarr","version":env!("CARGO_PKG_VERSION")}
            }}),
        )?;
        response(&mut reader, 1)?;
        write_request(&mut stdin, json!({"method":"initialized","params":{}}))?;
        write_request(
            &mut stdin,
            json!({"id":2,"method":"thread/start","params":{
                "cwd":cage,"approvalPolicy":"never","sandbox":"read-only"
            }}),
        )?;
        let url = thread_url(&response(&mut reader, 2)?)?;
        let thread_id = url.rsplit('/').next().ok_or("Codex thread id missing")?;
        write_request(&mut stdin, turn_start(thread_id, prompt))?;
        response(&mut reader, 3)?;
        Ok((reader, url))
    })();
    match result {
        Ok((reader, url)) => Ok((child, reader, url)),
        Err(err) => {
            let _ = child.kill();
            let _ = child.wait();
            Err(err)
        }
    }
}

/// Opens the created chat after Codex accepts the first turn. Drains the turn in a background thread.
pub fn handoff(bin: &str, cage: &Path, prompt: &str) -> Result<(), String> {
    let (mut child, mut reader, url) = start(bin, cage, prompt)?;
    let opened = Command::new("/usr/bin/open")
        .arg(&url)
        .status()
        .map_err(|e| format!("Open Codex desktop: {e}"))
        .and_then(|status| {
            if status.success() {
                Ok(())
            } else {
                Err(format!("Open Codex desktop: {status}"))
            }
        });
    if opened.is_ok() {
        std::thread::spawn(move || {
            let mut line = String::new();
            while reader.read_line(&mut line).unwrap_or(0) > 0 {
                if let Ok(value) = serde_json::from_str::<Value>(&line) {
                    if value.get("method").and_then(Value::as_str) == Some("turn/completed") {
                        break;
                    }
                }
                line.clear();
            }
            let _ = child.kill();
            let _ = child.wait();
        });
    } else {
        let _ = child.kill();
        let _ = child.wait();
    }
    opened
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn prompt_survives_json_encoding() {
        let message = turn_start("01a100ee-211f-7a71-ac1e-28d12d45e28d", "Warum?\n\"Test\"");
        assert_eq!(message["method"], "turn/start");
        assert_eq!(message["params"]["input"][0]["text"], "Warum?\n\"Test\"");
    }

    #[test]
    fn opens_only_a_valid_thread_id() {
        let response = json!({"result":{"thread":{"id":"01a100ee-211f-7a71-ac1e-28d12d45e28d"}}});
        assert_eq!(
            thread_url(&response).unwrap(),
            "codex://threads/01a100ee-211f-7a71-ac1e-28d12d45e28d"
        );
        let bad = json!({"result":{"thread":{"id":"../../settings"}}});
        assert!(thread_url(&bad).is_err());
    }
}
