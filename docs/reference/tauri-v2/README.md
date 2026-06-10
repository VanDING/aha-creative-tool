# Tauri v2 — Calling Rust from Frontend Reference

- **Official docs**: https://v2.tauri.app/develop/calling-rust/
- **Version**: Tauri v2 stable (as of 2026-06)

## Defining Commands (Rust)

### Basic Command

```rust
// src-tauri/src/commands.rs

#[tauri::command]
pub fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}
```

- In `lib.rs`: commands must NOT be `pub`
- In separate modules: commands MUST be `pub`
- Command names are globally unique, module prefix is ignored
- `#[tauri::command(rename_all = "snake_case")]` to accept snake_case from frontend

### Parameters

```rust
use tauri::{AppHandle, WebviewWindow, State, ipc::Request};

// Basic types (must impl Deserialize)
fn basic_cmd(message: String, count: i32) { }

// AppHandle
fn with_handle(app: AppHandle) { }

// WebviewWindow
fn with_window(win: WebviewWindow) { }

// Managed state
fn with_state(state: State<MyStruct>) { }

// Raw request (for ArrayBuffer uploads)
fn upload(request: Request) -> Result<(), Error> {
    if let tauri::ipc::InvokeBody::Raw(data) = request.body() { ... }
    let auth = request.headers().get("Authorization");
    Ok(())
}
```

### Return Values

```rust
// Any type impl Serialize
fn get_data() -> String { "hello".into() }
fn get_struct() -> MyStruct { ... }

// Result for error handling
fn login(user: String, pass: String) -> Result<String, String> {
    if valid { Ok("logged_in".into()) }
    else { Err("invalid credentials".into()) }
}

// Raw binary response (bypass JSON)
use tauri::ipc::Response;
fn read_file() -> Response {
    let data = std::fs::read("/path/to/file").unwrap();
    tauri::ipc::Response::new(data)
}
```

### Async Commands

```rust
#[tauri::command]
async fn async_cmd(value: String) -> String {
    some_async_fn().await;
    value
}
// Limitation: borrowed types (&str, State<'_, _>) not supported in async
// Workaround: use owned types, or wrap return in Result<T, ()>
```

### Channel (Streaming)

```rust
use tauri::ipc::Channel;

#[tauri::command]
async fn stream_data(ch: Channel<&[u8]>) {
    let mut file = tokio::fs::File::open("large.bin").await.unwrap();
    let mut buf = vec![0u8; 4096];
    loop {
        let n = file.read(&mut buf).await.unwrap();
        if n == 0 { break; }
        ch.send(&buf[..n]).unwrap();
    }
}
```

## Registration

```rust
// src-tauri/src/lib.rs
mod commands;

pub fn run() {
    tauri::Builder::default()
        .manage(MyState::new())
        .plugin(tauri_plugin_keyring::init())
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::git_init,
            commands::git_commit,
        ])
        .run(tauri::generate_context!())
        .expect("error running app");
}
```

## Calling from Frontend (JS/TS)

```ts
import { invoke } from '@tauri-apps/api/core';

// Basic
await invoke('greet', { name: 'World' });

// Return value
const result = await invoke<string>('greet', { name: 'World' });

// Error handling
try {
    await invoke('login', { user: 'a', password: 'b' });
} catch (error) {
    console.error(error);
}

// Raw binary upload
const data = new Uint8Array([1, 2, 3]);
await invoke('upload', data, {
    headers: { Authorization: 'apikey' }
});
```

## Error Handling (Rust — Recommended Pattern)

```rust
use thiserror::Error;

#[derive(Debug, Error)]
enum CommandError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Git error: {0}")]
    Git(String),
}

impl serde::Serialize for CommandError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::ser::Serializer
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

// Usage in command:
#[tauri::command]
fn read_config() -> Result<String, CommandError> {
    let content = std::fs::read_to_string("config.json")?; // auto converts io::Error
    Ok(content)
}
```

## Events (Alternative to Commands)

```ts
import { emit, listen, once } from '@tauri-apps/api/event';

// Listen
const unlisten = await listen('my-event', (event) => {
    console.log(event.payload);
});

// Emit
await emit('my-event', { message: 'hello' });

// Cleanup (important — SPA navigation doesn't auto-clean!)
unlisten();
```

**Commands vs Events:**
| Feature | Commands | Events |
|---------|----------|--------|
| Type-safe | ✅ | ❌ |
| Return value | ✅ | ❌ |
| Sync/Async | Both | Always async |
| Payload format | Any Serialize | JSON only |


## Capabilities (Permissions)

In `src-tauri/capabilities/default.json`:
```json
{
  "permissions": [
    "core:default",
    "keyring:allow-get-password",
    "keyring:allow-set-password"
  ]
}
```
