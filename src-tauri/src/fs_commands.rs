use std::fs;
use std::path::{Path, PathBuf};

const NODES_DIR: &str = "nodes";
const ARCHIVE_DIR: &str = "archive";
const EXPORTS_DIR: &str = "exports";
const GRAPH_INDEX: &str = "graph-index.json";

fn base_path(project_path: &str) -> PathBuf {
    Path::new(project_path).to_path_buf()
}

fn node_path(project_path: &str, filename: &str) -> PathBuf {
    base_path(project_path).join(NODES_DIR).join(filename)
}

fn graph_index_path(project_path: &str) -> PathBuf {
    base_path(project_path).join(GRAPH_INDEX)
}

/// Write a Markdown node file inside `project_path/nodes/`.
#[tauri::command]
pub fn write_node(
    project_path: String,
    filename: String,
    content: String,
) -> Result<String, String> {
    let path = node_path(&project_path, &filename);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/// Read a Markdown node file from `project_path/nodes/`.
#[tauri::command]
pub fn read_node(project_path: String, filename: String) -> Result<String, String> {
    let path = node_path(&project_path, &filename);
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Delete a Markdown node file from `project_path/nodes/`.
#[tauri::command]
pub fn delete_node(project_path: String, filename: String) -> Result<String, String> {
    let path = node_path(&project_path, &filename);
    fs::remove_file(&path).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/// Read the graph index JSON at `project_path/graph-index.json`.
#[tauri::command]
pub fn read_graph_index(project_path: String) -> Result<String, String> {
    let path = graph_index_path(&project_path);
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Write the graph index JSON at `project_path/graph-index.json`.
#[tauri::command]
pub fn write_graph_index(project_path: String, content: String) -> Result<String, String> {
    let path = graph_index_path(&project_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/// Create the standard project directory structure:
/// project_path/nodes, project_path/archive, project_path/exports
#[tauri::command]
pub fn create_project_dirs(project_path: String) -> Result<String, String> {
    let base = base_path(&project_path);
    fs::create_dir_all(base.join(NODES_DIR)).map_err(|e| e.to_string())?;
    fs::create_dir_all(base.join(ARCHIVE_DIR)).map_err(|e| e.to_string())?;
    fs::create_dir_all(base.join(EXPORTS_DIR)).map_err(|e| e.to_string())?;
    Ok(project_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn temp_dir() -> PathBuf {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let mut dir = env::temp_dir();
        dir.push(format!(
            "aha-test-{}-{}",
            std::process::id(),
            COUNTER.fetch_add(1, Ordering::SeqCst)
        ));
        dir
    }

    fn cleanup(path: &Path) {
        let _ = fs::remove_dir_all(path);
    }

    #[test]
    fn test_create_project_dirs() {
        let base = temp_dir();
        cleanup(&base);

        let result = create_project_dirs(base.to_string_lossy().to_string());
        assert!(result.is_ok());
        assert!(base.join(NODES_DIR).exists());
        assert!(base.join(ARCHIVE_DIR).exists());
        assert!(base.join(EXPORTS_DIR).exists());

        cleanup(&base);
    }

    #[test]
    fn test_write_and_read_node() {
        let base = temp_dir();
        cleanup(&base);
        create_project_dirs(base.to_string_lossy().to_string()).unwrap();

        let content = "# Hello\nThis is a node.";
        let wrote = write_node(
            base.to_string_lossy().to_string(),
            "hello.md".to_string(),
            content.to_string(),
        );
        assert!(wrote.is_ok());

        let read = read_node(base.to_string_lossy().to_string(), "hello.md".to_string());
        assert_eq!(read.unwrap(), content);

        cleanup(&base);
    }

    #[test]
    fn test_read_missing_node_fails() {
        let base = temp_dir();
        cleanup(&base);
        create_project_dirs(base.to_string_lossy().to_string()).unwrap();

        let read = read_node(base.to_string_lossy().to_string(), "missing.md".to_string());
        assert!(read.is_err());

        cleanup(&base);
    }

    #[test]
    fn test_delete_node() {
        let base = temp_dir();
        cleanup(&base);
        create_project_dirs(base.to_string_lossy().to_string()).unwrap();

        write_node(
            base.to_string_lossy().to_string(),
            "delete-me.md".to_string(),
            "bye".to_string(),
        )
        .unwrap();

        let deleted = delete_node(base.to_string_lossy().to_string(), "delete-me.md".to_string());
        assert!(deleted.is_ok());

        let read = read_node(base.to_string_lossy().to_string(), "delete-me.md".to_string());
        assert!(read.is_err());

        cleanup(&base);
    }

    #[test]
    fn test_write_and_read_graph_index() {
        let base = temp_dir();
        cleanup(&base);
        create_project_dirs(base.to_string_lossy().to_string()).unwrap();

        let content = r#"{"nodes":[],"edges":[]}"#;
        let wrote = write_graph_index(base.to_string_lossy().to_string(), content.to_string());
        assert!(wrote.is_ok());

        let read = read_graph_index(base.to_string_lossy().to_string());
        assert_eq!(read.unwrap(), content);

        cleanup(&base);
    }

    #[test]
    fn test_read_missing_graph_index_returns_empty_object() {
        let base = temp_dir();
        cleanup(&base);
        create_project_dirs(base.to_string_lossy().to_string()).unwrap();

        let read = read_graph_index(base.to_string_lossy().to_string());
        assert_eq!(read.unwrap(), "{}");

        cleanup(&base);
    }
}
