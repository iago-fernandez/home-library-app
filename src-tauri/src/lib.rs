use tauri::{Builder, Manager, State};
use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Serialize, Deserialize)]
pub struct Book {
    pub id: String,
    pub title: String,
    pub authors: Vec<String>,
    pub publisher: Option<String>,
    pub publish_date: Option<String>,
    pub isbn_13: Option<String>,
    pub location_room: Option<String>,
    pub location_bookcase: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedBooks {
    pub data: Vec<Book>,
    pub total: i64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateBookPayload {
    pub title: String,
    pub authors: Vec<String>,
    pub publisher: Option<String>,
    pub publish_date: Option<String>,
    pub isbn_13: Option<String>,
    pub location_room: Option<String>,
    pub location_bookcase: Option<String>,
}

#[tauri::command]
async fn get_books(
    limit: i64,
    offset: i64,
    sort_by: Option<String>,
    sort_order: Option<String>,
    search: Option<String>,
    client: State<'_, Client>
) -> Result<PaginatedBooks, String> {
    let api_url = std::env::var("API_URL").map_err(|_| "API_URL missing".to_string())?;
    let mut endpoint = format!("{}/books?limit={}&offset={}", api_url, limit, offset);

    if let Some(sort) = sort_by {
        endpoint.push_str(&format!("&sort_by={}", sort));
    }
    if let Some(order) = sort_order {
        endpoint.push_str(&format!("&sort_order={}", order));
    }
    if let Some(s) = search {
        endpoint.push_str(&format!("&search={}", s));
    }

    let response = client
        .get(&endpoint)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let paginated_data = response.json::<PaginatedBooks>().await.map_err(|e| e.to_string())?;
        Ok(paginated_data)
    } else {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_default();
        Err(format!("API GET Request failed: {} {}", status, error_body))
    }
}

#[tauri::command]
async fn create_book(payload: CreateBookPayload, client: State<'_, Client>) -> Result<Book, String> {
    let api_url = std::env::var("API_URL").map_err(|_| "API_URL missing".to_string())?;
    let endpoint = format!("{}/books", api_url);

    let response = client
        .post(&endpoint)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let book = response.json::<Book>().await.map_err(|e| e.to_string())?;
        Ok(book)
    } else {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_default();
        Err(format!("API POST Request failed: {} {}", status, error_body))
    }
}

#[tauri::command]
async fn delete_book(id: String, client: State<'_, Client>) -> Result<(), String> {
    let api_url = std::env::var("API_URL").map_err(|_| "API_URL missing".to_string())?;
    let endpoint = format!("{}/books/{}", api_url, id);

    let response = client
        .delete(&endpoint)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_default();
        Err(format!("API DELETE Request failed: {} {}", status, error_body))
    }
}

#[tauri::command]
async fn update_book(id: String, payload: CreateBookPayload, client: State<'_, Client>) -> Result<Book, String> {
    let api_url = std::env::var("API_URL").map_err(|_| "API_URL missing".to_string())?;
    let endpoint = format!("{}/books/{}", api_url, id);

    let response = client
        .put(&endpoint)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let book = response.json::<Book>().await.map_err(|e| e.to_string())?;
        Ok(book)
    } else {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_default();
        Err(format!("API PUT Request failed: {} {}", status, error_body))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .setup(|app| {
            dotenvy::dotenv().ok();

            let client = Client::builder()
                .build()
                .expect("Failed to build HTTP client");

            app.manage(client);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_books, create_book, delete_book, update_book])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}