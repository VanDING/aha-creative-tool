mod fs_commands;
mod git_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("[AHA] Starting Tauri application...");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_keyring::init())
        .manage(())
        .invoke_handler(tauri::generate_handler![
            fs_commands::write_node,
            fs_commands::read_node,
            fs_commands::delete_node,
            fs_commands::read_graph_index,
            fs_commands::write_graph_index,
            fs_commands::create_project_dirs,
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
        .setup(|_app| {
            println!("[AHA] Tauri setup complete.");
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
                println!("[AHA] DevTools opened.");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    println!("[AHA] Tauri application exited.");
}
