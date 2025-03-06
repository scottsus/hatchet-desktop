use std::io::{Read, Write};
use std::net::TcpStream;
use tauri::command;

#[command]
fn fetch_tcp_data(host: &str, port: u16) -> Result<String, String> {
    match TcpStream::connect(format!("{}:{}", host, port)) {
        Ok(mut stream) => {
            let mut response = String::new();
            match stream.read_to_string(&mut response) {
                Ok(_) => Ok(response),
                Err(e) => Err(format!("Failed to read from stream: {}", e))
            }
        },
        Err(e) => Err(format!("Failed to connect: {}", e))
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![fetch_tcp_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}