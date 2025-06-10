use tauri::{command, State, Manager};
use std::sync::{Arc, Mutex};

mod config;
mod sensor_listener;
mod arianna_interface;
mod sensor_service;

use config::{SensorServiceConfig, KNOWN_USER_IDS};
use sensor_service::SensorService;

struct AppState {
    sensor_service: Arc<Mutex<SensorService>>,
    app_handle: tauri::AppHandle,
}

#[command]
fn start_data_streaming(state: State<AppState>) -> Result<(), String> {
    let service = state.sensor_service.clone();
    let app_handle = state.app_handle.clone();
    
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(1));
        
        loop {
            interval.tick().await;
            
            for &user_id in KNOWN_USER_IDS {
                let service = service.lock().unwrap();
                if let Ok(data) = service.get_last_position(user_id) {
                    let _ = app_handle.emit_all("sensor_data", data);
                }
            }
        }
    });
    
    Ok(())
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
        .setup(|app| {
            let app_handle = app.handle();
            app.manage(AppState {
                sensor_service: Arc::new(Mutex::new(sensor_service)),
                app_handle: app_handle.clone(),
            });
            println!("🪓 Hatchet started");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_data_streaming
        ])
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                println!("🪓 Hatchet stopped");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
