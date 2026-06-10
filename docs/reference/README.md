# AHA Project — Dependency Reference Documentation

Last updated: 2026-06-10

This directory contains the latest API reference documentation for all key dependencies used in the AHA project. Each subdirectory focuses on one library, with extracted API signatures, usage patterns, and notes specific to how AHA uses the library.

## Directory Index

| Library | Path | Description |
|:---|:---|:---|
| **G6 v5** | [g6-v5/](g6-v5/) | Graph visualization engine. Node/Edge/Combo data format, 20+ layouts, 15 behaviors, 19 plugins |
| **Vercel AI SDK v6** | [vercel-ai-sdk-v6/](vercel-ai-sdk-v6/) | `streamText`, `generateObject`, providers setup, Ollama/OpenAI-compatible |
| **Motion** | [motion/](motion/) | Animation library (formerly Framer Motion). motion components, AnimatePresence, layout animations |
| **Tauri v2** | [tauri-v2/](tauri-v2/) | Rust-Frontend IPC. Commands, invoke, channels, error handling, capabilities |
| **TipTap** | [tiptap/](tiptap/) | Rich text editor. React usage, extensions, content serialization |
| **tauri-plugin-keyring** | [tauri-plugin-keyring/](tauri-plugin-keyring/) | OS-native credential storage. Password/Secret API, fallback plan |
| **git2-rs** | [git2-rs/](git2-rs/) | Rust libgit2 bindings. init/commit/tag/log/diff/status |
| **zundo** | [zundo/](zundo/) | Zustand undo/redo middleware. temporal config, partialize, limit |
| **dnd-kit** | [dnd-kit/](dnd-kit/) | Drag-and-drop (non-graph UI). Sortable, DndContext, sensors |

## Usage in Development

When implementing a feature that uses one of these libraries:

1. Open the corresponding subdirectory
2. Check the README for the specific API you need
3. Cross-reference with the [Architecture Design](../../Architecture%20design.md) document
4. If the library has released a major version since this doc was last updated, fetch the latest docs and update the README

## Updating These Docs

If you update a library:
1. Run `npm outdated` / `cargo outdated` to check versions
2. For major version bumps, re-fetch the library's documentation
3. Update the relevant README with new API signatures
4. Note the change in the Architecture Design document's Section 11

## Quick Reference: Install All Dependencies

### TypeScript/JavaScript
```bash
# Core
npm i react@18 react-dom@18
npm i -D typescript vite

# Graph
npm i @antv/g6 @antv/graphin

# AI
npm i ai @ai-sdk/openai @ai-sdk/anthropic

# Editor
npm i @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder

# State & UI
npm i zustand zundo motion
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Markdown
npm i unified remark-parse remark-gfm rehype-stringify rehype-sanitize

# Storage
npm i dexie

# Tauri frontend
npm i @tauri-apps/api @tauri-apps/plugin-fs tauri-plugin-keyring-api

# Dev
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm i -D @playwright/test
npx playwright install
npx shadcn@latest init
```

### Rust (Cargo.toml)
```toml
[dependencies]
tauri = "2"
git2 = { version = "0.21", features = ["vendored"] }
keyring = "3"                                      # fallback if plugin unstable
tauri-plugin-keyring = "0.1.0"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "2"
tokio = { version = "1", features = ["full"] }
notify = "7"
```
