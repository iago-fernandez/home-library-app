use tauri::Builder;

#[tauri::command]
fn create_book(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    println!("IPC Bridge Success. Payload received in Rust:\n{:#?}", payload);

    let mut response = payload.clone();
    response["id"] = serde_json::json!("mocked-db-uuid-1234");

    Ok(response)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![create_book])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}