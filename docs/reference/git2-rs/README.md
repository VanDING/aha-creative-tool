# git2-rs Reference Documentation

- **Crate**: `git2` v0.21.0
- **Docs**: https://docs.rs/git2/latest/git2/
- **License**: MIT / Apache 2.0
- **Depends on**: libgit2 (bundled or system)

## Cargo.toml

```toml
[dependencies]
git2 = "0.21"
```

For static linking of libgit2 (recommended for Tauri apps):
```toml
git2 = { version = "0.21", features = ["vendored"] }
```

## Core Operations

### Initialize Repository

```rust
use git2::Repository;

let repo = Repository::init("/path/to/a/repo")?;
```

### Open Existing Repository

```rust
let repo = Repository::open("/path/to/a/repo")?;
```

### Clone Repository

```rust
let repo = Repository::clone(
    "https://github.com/user/repo.git",
    "/path/to/local"
)?;
```

### Stage and Commit

```rust
use git2::{Repository, Signature, Index};

fn commit_changes(repo: &Repository, message: &str) -> Result<git2::Oid, git2::Error> {
    // Get the index
    let mut index = repo.index()?;
    
    // Stage all changes
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.write()?;
    
    // Write the tree
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;
    
    // Get signature
    let signature = Signature::now("AHA App", "aha@local")?;
    
    // Get parent commit (HEAD)
    let parent = match repo.head() {
        Ok(head) => Some(head.peel_to_commit()?),
        Err(_) => None,  // No commits yet
    };
    
    let parents: Vec<&git2::Commit> = parent.iter().collect();
    
    // Create commit
    let oid = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        message,
        &tree,
        &parents,
    )?;
    
    Ok(oid)
}
```

### Create Branch

```rust
// From HEAD
let head = repo.head()?;
let head_commit = head.peel_to_commit()?;
let branch = repo.branch("new-branch", &head_commit, false)?;

// Switch to branch
repo.set_head("refs/heads/new-branch")?;
```

### Create Tag

```rust
let head = repo.head()?.peel_to_commit()?;
let signature = Signature::now("AHA", "aha@local")?;

// Lightweight tag
repo.tag_lightweight("v1.0", &head.into_object(), false)?;

// Annotated tag
repo.tag(
    "v1.0",
    &head.into_object(),
    &signature,
    "Release v1.0",
    false,
)?;
```

### Remove File (git rm)

```rust
let mut index = repo.index()?;
index.remove_path(Path::new("nodes/some-node.md"))?;
index.write()?;
// Then commit as above
```

### Log / History

```rust
use git2::Revwalk;

let mut revwalk = repo.revwalk()?;
revwalk.push_head()?;  // Start from HEAD
revwalk.set_sorting(git2::Sort::TIME)?;

for oid in revwalk.take(20) {  // Last 20 commits
    let oid = oid?;
    let commit = repo.find_commit(oid)?;
    let author = commit.author();
    let message = commit.message().unwrap_or("");
    let time = commit.time();
    // ...
}
```

### Diff

```rust
use git2::DiffOptions;

// Diff between working directory and HEAD
let tree = repo.head()?.peel_to_tree()?;
let diff = repo.diff_tree_to_workdir(Some(&tree), Some(
    DiffOptions::new().include_ignored(false)
))?;

diff.foreach(
    &mut |delta, _| {
        println!("{}: {}", delta.status(), delta.new_file().path().unwrap().display());
        true
    },
    None, None, None,
)?;
```

### Status

```rust
let statuses = repo.statuses(Some(
    git2::StatusOptions::new()
        .include_untracked(true)
        .renames_head_to_index(true)
))?;

for entry in statuses.iter() {
    let status = entry.status();
    let path = entry.path().unwrap();
    
    if status.contains(git2::Status::INDEX_NEW) {
        println!("Staged new: {}", path);
    } else if status.contains(git2::Status::WT_MODIFIED) {
        println!("Modified: {}", path);
    } else if status.contains(git2::Status::WT_DELETED) {
        println!("Deleted: {}", path);
    }
}
```

## Tauri Command Integration Pattern

```rust
// src-tauri/src/git_commands.rs

use std::sync::Mutex;
use tauri::State;

pub struct GitState {
    pub repo: Mutex<Option<git2::Repository>>,
}

#[tauri::command]
pub fn git_init(path: String) -> Result<String, String> {
    Repository::init(&path)
        .map_err(|e| e.to_string())?;
    Ok("initialized".into())
}

#[tauri::command]
pub fn git_commit(
    repo_path: String,
    message: String,
) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| e.to_string())?;
    
    let oid = commit_changes(&repo, &message)
        .map_err(|e| e.to_string())?;
    
    Ok(oid.to_string())
}
```

## Important Notes

- All derivative objects (Index, Commit, Tree, etc.) are attached to the lifetime of the source `Repository`.
- Use `features = ["vendored"]` in Cargo.toml to bundle libgit2 — avoids requiring system-level installation.
- For SSH operations, use `RepoBuilder` from the `build` module.
- The signature (author/committer) can use hardcoded values for local-only operations.
