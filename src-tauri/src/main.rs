use std::io::Read;
use std::net::TcpStream;
use tauri::command;

const SERVER_IP: &str = "127.0.0.1";
const SERVER_PORT: u16 = 8080;
const BUFFER_SIZE: usize = 1024;

#[command]
fn fetch_tcp_data() -> Result<String, String> {
    match TcpStream::connect(format!("{}:{}", SERVER_IP, SERVER_PORT)) {
        Ok(mut stream) => {
            let mut buffer = [0; BUFFER_SIZE];
            
            match stream.read(&mut buffer) {
                Ok(bytes_read) => {
                    if bytes_read == 0 {
                        return Err("No data available from server".to_string());
                    }
                    
                    let is_empty = buffer[..bytes_read].iter().all(|&b| 
                        b == b'\n' || b == b'\r' || b == b' ' || b == b'\t' || b == 0
                    );
                    
                    if is_empty {
                        return Err("Received empty data from server".to_string());
                    }
                    
                    let response = String::from_utf8_lossy(&buffer[..bytes_read]).to_string();
                    Ok(response)
                },
                Err(e) => Err(format!("Failed to read from stream: {}", e))
            }
        },
        Err(e) => Err(format!("Connection failed: {}", e))
    }
}


fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![fetch_tcp_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
