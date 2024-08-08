use std::net::UdpSocket;
use std::str;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

struct AppState {
    socket: Arc<Mutex<UdpSocket>>,
}

#[tauri::command]
async fn get_coordinates(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let socket = state.socket.lock().await;
    let mut buf = [0; 1024];
    
    match socket.recv_from(&mut buf) {
        Ok((size, _)) => {
            if let Ok(s) = str::from_utf8(&buf[..size]) {
                Ok(s.to_string())
            } else {
                Err("Failed to parse received data".to_string())
            }
        }
        Err(e) => Err(format!("Error receiving data: {}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let socket = UdpSocket::bind("0.0.0.0:12345").expect("Failed to bind socket");
            socket.set_nonblocking(true).expect("Failed to set non-blocking");
            
            let app_state = AppState {
                socket: Arc::new(Mutex::new(socket)),
            };
            
            app.manage(app_state);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_coordinates])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}