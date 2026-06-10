# CLAUDE.md — AHA 创意生长工作台

## Project Identity

AHA is a **creative process visualization Git client** — a workbench for thinking.

- **Tech Stack**: TypeScript + React 18 (frontend), Rust (Tauri v2 backend)
- **Desktop**: Tauri v2 (macOS/Windows/Linux)
- **Mobile**: PWA minimal text input (v1.0+)
- **AI**: Vercel AI SDK v6, user-configured providers (OpenAI-compatible protocol)
- **License**: MIT (target)

## Quick Commands

```bash
# Frontend dev server
npm run dev              # http://localhost:1420

# Tauri desktop app (dev)
cargo tauri dev          # runs both frontend + Rust backend

# Build
npm run build            # Vite production build → dist/
cargo tauri build        # Full Tauri desktop bundle

# Testing
npm test                 # Vitest unit/component tests
npm run test:watch       # Vitest in watch mode
npm run test:e2e         # Playwright E2E (WebKit + Chromium)

# Code quality
npm run lint             # ESLint
npm run format           # Prettier
cargo fmt                # Rustfmt (from src-tauri/)
cargo clippy             # Clippy (from src-tauri/)
```

## Architecture: Layered + Domain-Core

```
presentation/  → application/  → domain/  → infrastructure/  → platform/
                                    ↑  zero external deps
```

See [Architecture design.md](Architecture%20design.md) for the complete design.

### Layer Purposes

| Layer | Path | Rules |
|:---|:---|:---|
| **Presentation** | `src/presentation/` | UI only — React components, hooks, stores. No business logic |
| **Application** | `src/application/` | Workflow orchestration. Depends on domain + infrastructure |
| **Domain** | `src/domain/` | **Zero external deps.** Pure TypeScript. Core business logic |
| **Infrastructure** | `src/infrastructure/` | TS interfaces for Rust-backed services (git, fs, ai, credentials) |
| **Platform** | `src-tauri/src/` | Rust backend — git2-rs, keyring, file ops |

### Path Aliases

```ts
@/              → src/
@presentation/  → src/presentation/
@application/   → src/application/
@domain/        → src/domain/
@infrastructure/→ src/infrastructure/
@shared/        → src/shared/
```

## Key Design Decisions

1. **Git-native data**: Each idea node = one `.md` file, graph structure = `graph-index.json`
2. **No default AI provider**: Users configure their own API keys. System is a "socket"
3. **AI = constrained engine**: Extensions ONLY on user trigger. No auto-behavior
4. **Confirmation = Branch**: AI suggestions become real nodes ONLY when user confirms
5. **Domain zero deps**: `src/domain/` imports nothing from React, Tauri, or any library
6. **Rust for heavy ops**: git2-rs for git, system keychain for API keys
7. **Protocol over provider**: OpenAI-compatible adapter covers 95%+ AI vendors

## Key Libraries

| Library | Purpose | Docs |
|:---|:---|:---|
| `@antv/g6` v5 | Graph visualization | `docs/reference/g6-v5/` |
| `ai` v6 + `@ai-sdk/*` | AI streaming+structured output | `docs/reference/vercel-ai-sdk-v6/` |
| `motion` (fka framer-motion) | Animations | `docs/reference/motion/` |
| `@tiptap/react` v3 | Rich text editor | `docs/reference/tiptap/` |
| `zustand` v5 + `zundo` v2 | State + undo/redo | `docs/reference/zundo/` |
| `git2` v0.21 (Rust) | Git operations | `docs/reference/git2-rs/` |
| `tauri-plugin-keyring` v0.1 (Rust) | Credential storage | `docs/reference/tauri-plugin-keyring/` |
| `@dnd-kit` v6 | Non-graph drag-and-drop | `docs/reference/dnd-kit/` |

Full dependency docs: `docs/reference/README.md`

## AI Provider Pattern

```ts
// User configures providers in Settings UI
// Stored in ~/.aha/providers.json (config, no keys)
// API keys stored in OS keychain via tauri-plugin-keyring

// At call time:
const apiKey = await credentialStore.getKey(providerId);
const model = createOpenAI({ baseURL, apiKey })(modelId);
const result = streamText({ model, system, messages });
```

## Rust Command Pattern

```rust
// src-tauri/src/git_commands.rs
#[tauri::command]
pub fn git_commit(repo_path: String, message: String) -> Result<String, String> { ... }

// src-tauri/src/lib.rs — register:
.invoke_handler(tauri::generate_handler![git_commands::git_commit])

// Frontend:
import { invoke } from '@tauri-apps/api/core';
const hash = await invoke<string>('git_commit', { repoPath, message });
```

## Behavioral Guidelines

1. **Think before coding**: State assumptions, surface tradeoffs, ask when uncertain
2. **Simplicity first**: Minimum code. No speculative features. No premature abstraction
3. **Surgical changes**: Touch only what you must. Match existing style
4. **Goal-driven**: Define verification criteria, loop until satisfied
5. **Domain purity**: `src/domain/` never imports from frameworks or libraries
6. **Test discipline**: Write tests alongside code, especially for domain layer
7. **Protocol over provider**: Add a new AI vendor via config, never via new adapter code

## Current Status (2026-06-11)

- [x] Product plan v1.1
- [x] Architecture design v1.1
- [x] Dependency evaluation
- [x] Project scaffolding
- [x] Dev environment verified
- [ ] Domain layer implementation
- [ ] Infrastructure layer implementation
- [ ] Presentation layer implementation
