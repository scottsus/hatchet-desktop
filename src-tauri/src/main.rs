use tauri::{command, State};
use std::sync::{Arc, Mutex};

mod config;
mod sensor_listener;
mod arianna_interface;
mod sensor_service;

use config::SensorServiceConfig;
use sensor_service::SensorService;

struct AppState {
    sensor_service: Arc<Mutex<SensorService>>,
}

#[command]
fn is_user_initialized(user_id: u8, state: State<AppState>) -> bool {
    let service = state.sensor_service.lock().unwrap();
    service.is_user_initialized(user_id)
}

#[command]
fn fetch_last_position(user_id: u8, state: State<AppState>) -> Result<String, String> {
    let service = state.sensor_service.lock().unwrap();
    service.get_last_position(user_id)
}

fn main() {
    let mut config = SensorServiceConfig::default();
    config.use_mock_listener = false;
    config.use_mock_arianna = true;
    
    let sensor_service = SensorService::new(config);
    
    if let Err(e) = sensor_service.start() {
        println!("Failed to start sensor service: {}", e);
        std::process::exit(1);
    }
    
    tauri::Builder::default()
        .manage(AppState {
            sensor_service: Arc::new(Mutex::new(sensor_service)),
        })
        .invoke_handler(tauri::generate_handler![
            is_user_initialized,
            fetch_last_position
        ])
        .setup(|_app| {
            println!("🪓 Hatchet started");
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                println!("🪓 Hatchet stopped");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
