use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;
use std::sync::{Arc, Mutex}; // Removed Once as it's unused
use tauri::{command, State}; // Removed Manager as it's unused
use std::sync::mpsc::{channel, Sender, Receiver};
use std::thread;
use lazy_static::lazy_static; // Use the lazy_static crate instead of std::lazy

const SERVER_IP: &str = "127.0.0.1";
const SERVER_PORT: u16 = 8000;
const BUFFER_SIZE: usize = 1024;

// Structure to manage our TCP connection
struct TcpConnection {
    stream: Option<TcpStream>,
    sender: Option<Sender<String>>,
    receiver: Option<Receiver<Result<String, String>>>, // Changed type to match what we're sending
}

impl TcpConnection {
    fn new() -> Self {
        TcpConnection {
            stream: None,
            sender: None,
            receiver: None,
        }
    }
    
    fn connect(&mut self) -> Result<(), String> {
        match TcpStream::connect(format!("{}:{}", SERVER_IP, SERVER_PORT)) {
            Ok(stream) => {
                // Set timeouts
                if let Err(e) = stream.set_read_timeout(Some(Duration::from_secs(2))) {
                    println!("Warning: Failed to set read timeout: {}", e);
                }
                
                println!("Connected to server at {}:{}", SERVER_IP, SERVER_PORT);
                self.stream = Some(stream);
                
                // Setup communication channels for the background thread
                // Specify the type parameters explicitly
                let (tx, rx) = channel::<String>();
                let (response_tx, response_rx) = channel::<Result<String, String>>();
                
                let mut stream_clone = self.stream.as_ref().unwrap().try_clone()
                    .map_err(|e| format!("Failed to clone stream: {}", e))?;
                
                // Start background thread for handling stream communication
                thread::spawn(move || {
                    while let Ok(cmd) = rx.recv() {
                        println!("Sending command: {}", cmd.trim());
                        
                        if let Err(e) = stream_clone.write_all(cmd.as_bytes()) {
                            println!("Failed to send command: {}", e);
                            let _ = response_tx.send(Err(format!("Failed to send command: {}", e)));
                            continue;
                        }
                        
                        if let Err(e) = stream_clone.flush() {
                            println!("Failed to flush stream: {}", e);
                            let _ = response_tx.send(Err(format!("Failed to flush stream: {}", e)));
                            continue;
                        }
                        
                        // Wait a bit for server to process
                        thread::sleep(Duration::from_millis(200));
                        
                        // Read response
                        let mut buffer = [0; BUFFER_SIZE];
                        let mut response = String::new();
                        
                        // Set a timeout for reading the response
                        let timeout = Duration::from_millis(1000); // Increase timeout for slow responses
                        let start_time = std::time::Instant::now();
                        
                        loop {
                            match stream_clone.read(&mut buffer) {
                                Ok(bytes_read) => {
                                    if bytes_read > 0 {
                                        let chunk = String::from_utf8_lossy(&buffer[..bytes_read]);
                                        response.push_str(&chunk);
                                        println!("Received data: {}", response.trim());
                                        
                                        // If we've received content, send it
                                        if !response.trim().is_empty() {
                                            let _ = response_tx.send(Ok(response));
                                            break;
                                        }
                                    }
                                    
                                    // Check if we've timed out
                                    if start_time.elapsed() >= timeout {
                                        if response.trim().is_empty() {
                                            println!("Timeout waiting for response - server may not recognize command");
                                            // No response received within timeout - just return empty response
                                            let _ = response_tx.send(Err("Timeout waiting for response - server may not recognize command".to_string()));
                                        } else {
                                            // We did get some data, so return what we have
                                            let _ = response_tx.send(Ok(response));
                                        }
                                        break;
                                    }
                                    
                                    // Small delay before trying again
                                    thread::sleep(Duration::from_millis(50));
                                },
                                Err(e) => {
                                    // Print error and send it back
                                    println!("Error reading from stream: {}", e);
                                    let _ = response_tx.send(Err("Error found".to_string()));
                                }
                            }
                        }
                    }
                    println!("Connection handler thread terminated");
                });
                
                self.sender = Some(tx);
                self.receiver = Some(response_rx); // Now this matches the receiver type
                Ok(())
            },
            Err(e) => Err(format!("Failed to connect to server: {}", e)),
        }
    }
    
    fn ensure_connected(&mut self) -> Result<(), String> {
        if self.stream.is_none() || self.sender.is_none() || self.receiver.is_none() {
            self.connect()?;
        }
        Ok(())
    }
    
    fn send_command(&mut self, command: String) -> Result<String, String> {
        self.ensure_connected()?;
        
        let sender = self.sender.as_ref().unwrap();
        let receiver = self.receiver.as_ref().unwrap();
        
        // Check if this is a Last or Get command that will need special handling
        let is_track_command = command.trim_end().starts_with("Last") || command.trim_end().starts_with("Get");
        let user_id = if is_track_command {
            // Extract the user_id from the command (Last X or Get X)
            command.trim_end().split_whitespace().nth(1).and_then(|s| s.parse::<u8>().ok())
        } else {
            None
        };
        
        if let Err(e) = sender.send(command) {
            return Err(format!("Failed to send command to thread: {}", e));
        }
        
        // For track commands (Last/Get), we may need to collect multiple responses
        // until we see the End marker
        if is_track_command && user_id.is_some() {
            let mut complete_response = String::new();
            let end_marker = format!("End ({})", user_id.unwrap());
            
            loop {
                match receiver.recv() {
                    Ok(result) => match result {
                        Ok(chunk) => {
                            complete_response.push_str(&chunk);
                            
                            // Check if we've received the end marker
                            if complete_response.contains(&end_marker) {
                                // Remove the end marker from the response
                                if let Some(end_pos) = complete_response.find(&end_marker) {
                                    // Trim the response to remove the end marker and anything after it
                                    complete_response.truncate(end_pos);
                                    // Remove any trailing newline or whitespace
                                    complete_response = complete_response.trim_end().to_string();
                                }
                                break;
                            }
                            
                            // If not, continue receiving data
                            println!("Partial data received, continuing to read...");
                            
                            // Check if there are additional messages without waiting too long
                            if receiver.recv_timeout(Duration::from_secs(2)).is_err() {
                                println!("Timeout waiting for end marker, returning partial data");
                                break;
                            }
                        },
                        Err(e) => return Err(e),
                    },
                    Err(e) => return Err(format!("Failed to receive response from thread: {}", e)),
                }
            }
            
            return Ok(complete_response);
        } else {
            // For normal commands, just return the single response
            match receiver.recv() {
                Ok(result) => result,
                Err(e) => Err(format!("Failed to receive response from thread: {}", e)),
            }
        }
    }
}

// Safe to share across threads
type SharedConnection = Arc<Mutex<TcpConnection>>;

struct AppState {
    connection: SharedConnection,
}

#[command]
fn initialize_user(user_id: u8, state: State<AppState>) -> Result<String, String> {
    let command = format!("Init {}\n", user_id);
    let mut connection = state.connection.lock().unwrap();
    connection.send_command(command)
}

#[command]
fn set_parameters(
    user_id: u8,
    offset_x: f64,
    offset_y: f64,
    north_orientation: f64,
    track_compensation: f64,
    internal_param: f64, // Always 0.0 as specified
    track_type: u8, // 1 or 4
    start_latitude: f64,
    start_longitude: f64,
    state: State<AppState>
) -> Result<String, String> {
    let command = format!(
        "SetParameters {} {} {} {} {} {} {} {} {}\n",
        user_id, offset_x, offset_y, north_orientation, track_compensation, 
        internal_param, track_type, start_latitude, start_longitude
    );
    let mut connection = state.connection.lock().unwrap();
    connection.send_command(command)
}

#[command]
fn clear_user(user_id: u8, state: State<AppState>) -> Result<String, String> {
    let command = format!("Clear {}\n", user_id);
    let mut connection = state.connection.lock().unwrap();
    connection.send_command(command)
}

#[command]
fn clear_all(state: State<AppState>) -> Result<String, String> {
    let mut connection = state.connection.lock().unwrap();
    connection.send_command("ClearAll\n".to_string())
}

#[command]
fn set_message(user_id: u8, message: String, state: State<AppState>) -> Result<String, String> {
    let command = format!("Set {}{}\n", user_id, message);
    let mut connection = state.connection.lock().unwrap();
    connection.send_command(command)
}

#[command]
fn fetch_all_position(user_id: u8, state: State<AppState>) -> Result<String, String> {
    let command = format!("Get {}\n", user_id);
    let mut connection = state.connection.lock().unwrap();
    connection.send_command(command)
}

#[command]
fn fetch_last_position(user_id: u8, state: State<AppState>) -> Result<String, String> {
    let command = format!("Last {}\n", user_id);
    let mut connection = state.connection.lock().unwrap();
    connection.send_command(command)
}

fn main() {
    // Create a shared connection
    let connection = Arc::new(Mutex::new(TcpConnection::new()));
    
    // Try to connect initially (optional)
    if let Err(e) = connection.lock().unwrap().connect() {
        println!("Initial connection failed: {}. Will retry when needed.", e);
    }
    
    tauri::Builder::default()
        .manage(AppState { connection })
        .invoke_handler(tauri::generate_handler![
            initialize_user,
            set_parameters,
            clear_user,
            clear_all,
            set_message,
            fetch_all_position,
            fetch_last_position
        ])
        .setup(|_app| {
            // Optionally set up a reconnection timer or other initialization
            Ok(())
        })
        .on_window_event(|event| {
            // Clean up connection when app is closed
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                println!("Application closing, cleaning up TCP connection...");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}