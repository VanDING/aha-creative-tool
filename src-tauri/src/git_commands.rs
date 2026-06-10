use git2::{DiffOptions, ObjectType, Repository, Signature, StatusOptions};
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct CommitLog {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: i64,
}

#[derive(Debug, Serialize)]
pub struct DiffResult {
    pub patch: String,
}

#[derive(Debug, Serialize)]
pub struct FileStatus {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct GitStatusResult {
    pub branch: String,
    pub ahead_behind: Option<(usize, usize)>,
    pub files: Vec<FileStatus>,
}

fn open_repo(repo_path: &str) -> Result<Repository, String> {
    Repository::open(repo_path).map_err(|e| e.to_string())
}

fn default_signature(repo: &Repository) -> Result<Signature<'static>, String> {
    match repo.signature() {
        Ok(sig) => Ok(sig),
        Err(_) => Signature::now("AHA User", "aha@localhost").map_err(|e| e.to_string()),
    }
}

/// Initialize a new Git repository at the given path.
#[tauri::command]
pub fn git_init(path: String) -> Result<String, String> {
    Repository::init(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

/// Stage a file path relative to the repository root.
#[tauri::command]
pub fn git_add(repo_path: String, file_path: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index.add_path(Path::new(&file_path)).map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;
    Ok(file_path)
}

/// Remove a file from the index and working tree.
#[tauri::command]
pub fn git_rm(repo_path: String, file_path: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index.remove_path(Path::new(&file_path)).map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;
    std::fs::remove_file(Path::new(&repo_path).join(&file_path)).ok();
    Ok(file_path)
}

/// Commit all staged changes with the provided message.
/// Returns the commit OID string.
#[tauri::command]
pub fn git_commit(repo_path: String, message: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let signature = default_signature(&repo)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;

    let parent_commits: Vec<git2::Commit> = match repo.head() {
        Ok(head) => {
            let head_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
            vec![head_commit]
        }
        Err(_) => vec![],
    };
    let parents: Vec<&git2::Commit> = parent_commits.iter().collect();

    let commit_oid = repo
        .commit(Some("HEAD"), &signature, &signature, &message, &tree, &parents)
        .map_err(|e| e.to_string())?;

    Ok(commit_oid.to_string())
}

/// Get repository status.
#[tauri::command]
pub fn git_status(repo_path: String) -> Result<GitStatusResult, String> {
    let repo = open_repo(&repo_path)?;

    let branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()).ok())
        .unwrap_or_else(|| "HEAD".to_string());

    let mut opts = StatusOptions::new();
    opts.include_untracked(true).renames_head_to_index(true);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    let mut files = Vec::new();
    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();
        let status_str = if status.is_index_new() || status.is_wt_new() {
            "added"
        } else if status.is_index_modified() || status.is_wt_modified() {
            "modified"
        } else if status.is_index_deleted() || status.is_wt_deleted() {
            "deleted"
        } else {
            "other"
        };
        files.push(FileStatus { path, status: status_str.to_string() });
    }

    Ok(GitStatusResult { branch, ahead_behind: None, files })
}

/// Get commit log, optionally filtered to a file path.
#[tauri::command]
pub fn git_log(
    repo_path: String,
    file_path: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<CommitLog>, String> {
    let repo = open_repo(&repo_path)?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;

    let limit = limit.unwrap_or(50);
    let mut logs = Vec::new();

    for oid in revwalk {
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;

        if let Some(ref path) = file_path {
            let tree = commit.tree().map_err(|e| e.to_string())?;
            if tree.get_path(Path::new(path)).is_err() {
                continue;
            }
        }

        logs.push(CommitLog {
            hash: oid.to_string(),
            message: commit.message().unwrap_or("").to_string(),
            author: format!(
                "{} <{}>",
                commit.author().name().unwrap_or(""),
                commit.author().email().unwrap_or("")
            ),
            timestamp: commit.time().seconds(),
        });

        if logs.len() >= limit {
            break;
        }
    }

    Ok(logs)
}

/// Get diff between two commits (or commit and working tree if commit_b is empty).
#[tauri::command]
pub fn git_diff(
    repo_path: String,
    commit_a: String,
    commit_b: Option<String>,
) -> Result<DiffResult, String> {
    let repo = open_repo(&repo_path)?;

    let commit_a_obj = repo
        .find_commit(git2::Oid::from_str(&commit_a).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    let tree_a = commit_a_obj.tree().map_err(|e| e.to_string())?;

    let diff = if let Some(b) = commit_b {
        let commit_b_obj = repo
            .find_commit(git2::Oid::from_str(&b).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        let tree_b = commit_b_obj.tree().map_err(|e| e.to_string())?;
        let mut opts = DiffOptions::new();
        repo.diff_tree_to_tree(Some(&tree_a), Some(&tree_b), Some(&mut opts))
            .map_err(|e| e.to_string())?
    } else {
        let mut opts = DiffOptions::new();
        repo.diff_tree_to_workdir_with_index(Some(&tree_a), Some(&mut opts))
            .map_err(|e| e.to_string())?
    };

    let mut patch = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        use std::str;
        if let Ok(content) = str::from_utf8(line.content()) {
            patch.push_str(content);
        }
        true
    })
    .map_err(|e| e.to_string())?;

    Ok(DiffResult { patch })
}

// Task 2.1.2: branch / tag management

/// Create a new branch at HEAD.
#[tauri::command]
pub fn git_create_branch(repo_path: String, name: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    repo.branch(&name, &commit, false).map_err(|e| e.to_string())?;
    Ok(name)
}

/// Switch to an existing branch.
#[tauri::command]
pub fn git_switch_branch(repo_path: String, name: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let branch = repo.find_branch(&name, git2::BranchType::Local).map_err(|e| e.to_string())?;
    let reference = branch.get().peel_to_commit().map_err(|e| e.to_string())?;
    repo.checkout_tree(reference.as_object(), None).map_err(|e| e.to_string())?;
    let name_str = branch.get().name().map_err(|e| e.to_string())?.to_string();
    repo.set_head(&name_str).map_err(|e| e.to_string())?;
    Ok(name_str)
}

/// Merge a branch into the current branch (fast-forward only for simplicity).
#[tauri::command]
pub fn git_merge_branch(repo_path: String, name: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let branch_ref = repo.find_branch(&name, git2::BranchType::Local).map_err(|e| e.to_string())?;
    let target_commit = branch_ref.get().peel_to_commit().map_err(|e| e.to_string())?;
    let signature = default_signature(&repo)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;

    let head_commit = repo.head().and_then(|h| h.peel_to_commit()).map_err(|e| e.to_string())?;
    let commit_oid = repo
        .commit(
            Some("HEAD"),
            &signature,
            &signature,
            &format!("Merge branch '{}'", name),
            &tree,
            &[&head_commit, &target_commit],
        )
        .map_err(|e| e.to_string())?;

    Ok(commit_oid.to_string())
}

/// Create an annotated tag.
#[tauri::command]
pub fn git_create_tag(repo_path: String, name: String, message: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let obj = repo
        .head()
        .map_err(|e| e.to_string())?
        .peel(ObjectType::Commit)
        .map_err(|e| e.to_string())?;
    let signature = default_signature(&repo)?;
    let tag_oid = repo.tag(&name, &obj, &signature, &message, false).map_err(|e| e.to_string())?;
    Ok(tag_oid.to_string())
}

/// List all tag names.
#[tauri::command]
pub fn git_list_tags(repo_path: String) -> Result<Vec<String>, String> {
    let repo = open_repo(&repo_path)?;
    let mut tags = Vec::new();
    repo.tag_foreach(|_oid, name| {
        if let Ok(name_str) = std::str::from_utf8(name) {
            tags.push(name_str.trim_start_matches("refs/tags/").to_string());
        }
        true
    })
    .map_err(|e| e.to_string())?;
    Ok(tags)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_repo() -> (String, std::path::PathBuf) {
        let mut dir = env::temp_dir();
        dir.push(format!(
            "aha-git-test-{}-{}",
            std::process::id(),
            COUNTER.fetch_add(1, Ordering::SeqCst)
        ));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let path_str = dir.to_string_lossy().to_string();
        git_init(path_str.clone()).unwrap();
        (path_str, dir)
    }

    fn write_file(repo: &str, rel: &str, content: &str) {
        let path = std::path::Path::new(repo).join(rel);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).unwrap();
        }
        std::fs::write(&path, content).unwrap();
    }

    #[test]
    fn test_git_init() {
        let (_path, dir) = temp_repo();
        assert!(dir.join(".git").exists());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_git_add_and_commit() {
        let (path, dir) = temp_repo();
        write_file(&path, "nodes/hello.md", "# Hello");
        git_add(path.clone(), "nodes/hello.md".to_string()).unwrap();
        let hash = git_commit(path.clone(), "Initial commit".to_string()).unwrap();
        assert_eq!(hash.len(), 40);

        let log = git_log(path.clone(), None, Some(10)).unwrap();
        assert_eq!(log.len(), 1);
        assert_eq!(log[0].message, "Initial commit");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_git_status() {
        let (path, dir) = temp_repo();
        write_file(&path, "nodes/new.md", "content");
        git_add(path.clone(), "nodes/new.md".to_string()).unwrap();
        git_commit(path.clone(), "First".to_string()).unwrap();

        write_file(&path, "nodes/modified.md", "x");
        let status = git_status(path.clone()).unwrap();
        assert_eq!(status.branch, "master");
        assert!(status.files.iter().any(|f| f.path == "nodes/modified.md"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_git_rm() {
        let (path, dir) = temp_repo();
        write_file(&path, "nodes/del.md", "bye");
        git_add(path.clone(), "nodes/del.md".to_string()).unwrap();
        git_commit(path.clone(), "Add".to_string()).unwrap();

        git_rm(path.clone(), "nodes/del.md".to_string()).unwrap();
        git_commit(path.clone(), "Remove".to_string()).unwrap();

        let status = git_status(path.clone()).unwrap();
        assert!(!status.files.iter().any(|f| f.path == "nodes/del.md"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_git_branch_and_tag() {
        let (path, dir) = temp_repo();
        write_file(&path, "main.md", "main");
        git_add(path.clone(), "main.md".to_string()).unwrap();
        git_commit(path.clone(), "Main".to_string()).unwrap();

        git_create_branch(path.clone(), "feature".to_string()).unwrap();
        git_create_tag(path.clone(), "v1.0".to_string(), "Version 1.0".to_string()).unwrap();

        let tags = git_list_tags(path.clone()).unwrap();
        assert!(tags.contains(&"v1.0".to_string()));

        let _ = std::fs::remove_dir_all(&dir);
    }
}
