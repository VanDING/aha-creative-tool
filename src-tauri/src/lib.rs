mod fs_commands;
mod git_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_keyring::init())
        .manage(())
        .invoke_handler(tauri::generate_handler![
            // File system
            fs_commands::write_node,
            fs_commands::read_node,
            fs_commands::delete_node,
            fs_commands::read_graph_index,
            fs_commands::write_graph_index,
            fs_commands::create_project_dirs,
            // Git
            git_commands::git_init,
            git_commands::git_add,
            git_commands::git_commit,
            git_commands::git_rm,
            git_commands::git_status,
            git_commands::git_log,
            git_commands::git_diff,
            git_commands::git_create_branch,
            git_commands::git_switch_branch,
            git_commands::git_merge_branch,
            git_commands::git_create_tag,
            git_commands::git_list_tags,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
