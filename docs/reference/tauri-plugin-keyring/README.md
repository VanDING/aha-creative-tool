# tauri-plugin-keyring Reference Documentation

- **GitHub**: https://github.com/charlesportwoodii/tauri-plugin-keyring
- **Version**: v0.1.0 (early stage — 9 commits, 6 stars)
- **Tauri v2**: ✅ Supported
- **Rust Requirement**: ≥ 1.77.2
- **License**: MIT / Apache 2.0

## Installation

**Rust (Cargo.toml):**
```toml
tauri-plugin-keyring = "0.1.0"
# Or via Git:
# tauri-plugin-keyring = { git = "https://github.com/charlesportwoodii/tauri-plugin-keyring", branch = "master" }
```

**JavaScript:**
```bash
npm add tauri-plugin-keyring-api
```

## Registration

**Rust (lib.rs):**
```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_keyring::init())
        .run(tauri::generate_context!())
        .expect("error running");
}
```

**Capabilities (default.json):**
```json
{
  "permissions": [
    "keyring:allow-initialize-keyring",
    "keyring:allow-set-password",
    "keyring:allow-get-password",
    "keyring:allow-delete-password",
    "keyring:allow-has-password",
    "keyring:allow-set-secret",
    "keyring:allow-get-secret",
    "keyring:allow-delete-secret",
    "keyring:allow-has-secret"
  ]
}
```

## JavaScript API

```ts
import {
  initializeKeyring,
  setPassword, getPassword, deletePassword, hasPassword,
  setSecret, getSecret, deleteSecret, hasSecret,
} from 'tauri-plugin-keyring';

// Initialize (call ONCE before other operations)
await initializeKeyring('com.aha.app');

// Password operations
await setPassword('provider-id', 'sk-abc123...');
const key: string = await getPassword('provider-id');
const exists: boolean = await hasPassword('provider-id');
await deletePassword('provider-id');

// Binary secret operations
const data = new TextEncoder().encode('sensitive');
await setSecret('some-key', Array.from(data));
const retrieved: number[] = await getSecret('some-key');
await deleteSecret('some-key');
```

## Rust API (for Tauri Command integration)

```rust
use tauri_plugin_keyring::KeyringExt;

#[tauri::command]
async fn store_api_key(
    app: tauri::AppHandle,
    provider_id: String,
    api_key: String
) -> Result<(), String> {
    app.keyring()
        .initialize_service("com.aha.app".to_string())
        .map_err(|e| e.to_string())?;

    app.keyring().set(
        &provider_id,
        tauri_plugin_keyring::CredentialType::Password,
        tauri_plugin_keyring::CredentialValue::Password(api_key)
    ).map_err(|e| e.to_string())?;

    Ok(())
}
```

## Platform Support

| Platform | Status | Backend |
|----------|:------:|---------|
| macOS | ✅ | Keychain Services + Secure Enclave |
| Windows | ✅ | Windows Credential Manager (hardware-backed) |
| Linux | ❌ | Not supported |
| Android | ✅ | Android Keystore (hardware security module) |
| iOS | ✅ | Keychain Services + Secure Enclave |

## ⚠️ Fallback Plan

Since this plugin is **v0.1.0 and very early stage**, if issues arise, fall back to the Rust `keyring` crate directly:

```toml
# Cargo.toml
keyring = "3"
```

```rust
use keyring::Entry;

#[tauri::command]
fn store_api_key(provider_id: String, api_key: String) -> Result<(), String> {
    let entry = Entry::new("aha", &provider_id).map_err(|e| e.to_string())?;
    entry.set_password(&api_key).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_api_key(provider_id: String) -> Result<String, String> {
    let entry = Entry::new("aha", &provider_id).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}
```
