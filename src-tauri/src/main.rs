use std::io::{Read, Write};
use std::net::TcpStream;
use std::collections::HashSet;
use std::net::TcpListener;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use std::sync::{Arc, Mutex}; // Removed Once as it's unused
use tauri::{command, State}; // Removed Manager as it's unused
use std::sync::mpsc::{channel, Sender, Receiver};
use std::thread;
use lazy_static::lazy_static; // Use the lazy_static crate instead of std::lazy

const SERVER_IP: &str = "127.0.0.1";
const SERVER_PORT: u16 = 8000;
const BUFFER_SIZE: usize = 1024;

// Helper functions that can be called internally
fn send_init_command(user_id: u8, connection: &mut TcpConnection) -> Result<String, String> {
    let command = format!("Init {}\n", user_id);
    // Init doesn't need a response
    connection.send_command(command, false)
}

fn send_set_parameters_command(
    user_id: u8,
    offset_x: f64,
    offset_y: f64,
    north_orientation: f64,
    track_compensation: f64,
    internal_param: f64,
    track_type: u8,
    start_latitude: f64,
    start_longitude: f64,
    connection: &mut TcpConnection
) -> Result<String, String> {
    let command = format!(
        "SetParameters {},{},{},{},{},{},{},{},{}\n",
        user_id, offset_x, offset_y, north_orientation, track_compensation, 
        internal_param, track_type, start_latitude, start_longitude
    );
    // SetParameters doesn't need a response
    connection.send_command(command, false)
}

fn send_set_message_command(message: String, connection: &mut TcpConnection) -> Result<String, String> {
    let command = format!("Set {}\n", message);
    // Set command doesn't need a response
    connection.send_command(command, false)
}

fn process_hash_line(
    line: &str, 
    server_connection: &SharedConnection, 
    initialized_operators: &Arc<Mutex<HashSet<u8>>>
) {
    // Print line in console
    println!("Processing line: {}", line);
    if let Some(hex_op_id) = line.get(1..3) {
        // Convert from hex to decimal
        if let Ok(operator_id) = u8::from_str_radix(hex_op_id, 16) {
            println!("Found operator ID: {} (hex: {})", operator_id, hex_op_id);
            
            // Check if we've seen this operator ID before
            let mut ops = initialized_operators.lock().unwrap();
            if !ops.contains(&operator_id) {
                println!("New operator ID discovered, initializing: {}", operator_id);
                
                // Use existing functions to initialize this operator
                let mut conn = server_connection.lock().unwrap();
                
                // Check connection health before proceeding
                if !conn.is_connection_alive() {
                    println!("Connection appears unhealthy, attempting to reconnect");
                    if let Err(e) = conn.ensure_connected() {
                        println!("Failed to reconnect: {}, cannot initialize user {}", e, operator_id);
                        return;
                    }
                }
                
                // Only add to initialized set AFTER successful init
                match send_init_command(operator_id, &mut conn) {
                    Ok(_) => {
                        println!("User {} initialized successfully", operator_id);
                        
                        // Set default parameters
                        match send_set_parameters_command(
                            operator_id, 
                            0.0,        // offset_x
                            0.0,        // offset_y
                            0.0,        // north_orientation
                            0.0,        // track_compensation
                            0.0,        // internal_param
                            4,          // track_type (default to 4)
                            0.0,  // default latitude
                            0.0,   // default longitude
                            &mut conn   // pass the connection correctly
                        ) {
                            Ok(_) => {
                                println!("Parameters set for user {}", operator_id);
                                // Only NOW add to initialized set after both calls succeeded
                                ops.insert(operator_id);
                            },
                            Err(e) => {
                                println!("Failed to set parameters for user {}: {}", operator_id, e);
                                // Don't add to initialized set
                            }
                        }
                    },
                    Err(e) => {
                        println!("Failed to initialize user {}: {}", operator_id, e);
                        // Don't add to initialized set
                    }
                }
            }
            
            // At the end of processing, send the hashtag message via Set command
            let mut conn = server_connection.lock().unwrap();
            
            // Check connection health before sending
            if !conn.is_connection_alive() {
                if let Err(e) = conn.ensure_connected() {
                    println!("Connection failed, cannot send hashtag message: {}", e);
                    return;
                }
            }
            
            // Ensure we're sending the complete message
            let full_message = line.to_string();
            println!("Sending full message: {}", full_message);
            match send_set_message_command(full_message, &mut conn) {
                Ok(_) => {
                    println!("Successfully sent hashtag message: {}", line);
                },
                Err(e) => {
                    println!("Failed to send hashtag message: {}", e);
                }
            }
        }
    }
}

struct DataStreamerConnection {
    listener: Option<TcpListener>,
    is_running: Arc<AtomicBool>,
    initialized_operators: Arc<Mutex<HashSet<u8>>>,
}

impl DataStreamerConnection {
    fn new() -> Self {
        DataStreamerConnection {
            listener: None,
            is_running: Arc::new(AtomicBool::new(false)),
            initialized_operators: Arc::new(Mutex::new(HashSet::new())),
        }
    }
    
    fn start_listening(&mut self, ip: String, port: u16, server_connection: SharedConnection) -> Result<(), String> {
        // Skip if already running
        if self.is_running.load(Ordering::SeqCst) {
            return Ok(());
        }
        
        // Set up the listener
        let address = format!("{}:{}", ip, port);
        let listener = TcpListener::bind(&address)
            .map_err(|e| format!("Failed to bind to {}:{}: {}", ip, port, e))?;
        
        // Set listener to non-blocking mode
        listener.set_nonblocking(true)
            .map_err(|e| format!("Failed to set listener to non-blocking mode: {}", e))?;
            
        self.listener = Some(listener);
        self.is_running.store(true, Ordering::SeqCst);
        
        // Clone what we need for the thread
        let listener_clone = self.listener.as_ref().unwrap().try_clone()
            .map_err(|e| format!("Failed to clone listener: {}", e))?;
        let is_running = self.is_running.clone();
        let initialized_operators = self.initialized_operators.clone();
        let server_conn = server_connection.clone();
        let address_clone = address.clone();
        
        // Start the listener thread
        thread::spawn(move || {
            println!("Data streamer listener started on {}", address_clone);
            
            while is_running.load(Ordering::SeqCst) {
                // Try to accept a connection
                match listener_clone.accept() {
                    Ok((mut stream, addr)) => {
                        println!("New data streamer connection from: {}", addr);
                        
                        // Clone what we need for this connection's thread
                        let server_conn_clone = server_conn.clone();
                        let initialized_ops_clone = initialized_operators.clone();
                        let is_running_clone = is_running.clone();
                        
                        thread::spawn(move || {
                            let mut buffer = [0; BUFFER_SIZE];
                            
                            while is_running_clone.load(Ordering::SeqCst) {
                                match stream.read(&mut buffer) {
                                    Ok(0) => {
                                        println!("Data streamer connection closed");
                                        break;
                                    },
                                    Ok(bytes_read) => {
                                        let data = String::from_utf8_lossy(&buffer[..bytes_read]);
                                        
                                        // Process each line
                                        for line in data.lines() {
                                            if line.starts_with('#') {
                                                process_hash_line(line, &server_conn_clone, &initialized_ops_clone);
                                            }
                                        }
                                    },
                                    Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock 
                                              || e.kind() == std::io::ErrorKind::TimedOut => {
                                        thread::sleep(Duration::from_millis(50));
                                    },
                                    Err(e) => {
                                        println!("Error reading from data streamer: {}", e);
                                        break;
                                    }
                                }
                            }
                            println!("Data streamer connection handler terminated");
                        });
                    },
                    Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(100));
                    },
                    Err(e) => {
                        println!("Error accepting connection: {}", e);
                        thread::sleep(Duration::from_secs(1));
                    }
                }
            }
            println!("Data streamer listener stopped");
        });
        
        Ok(())
    }
    
    fn stop_listening(&mut self) {
        self.is_running.store(false, Ordering::SeqCst);
        println!("Data streamer listener stopping...");
    }
}

// Structure to manage our TCP connection
struct TcpConnection {
    stream: Option<TcpStream>,
    sender: Option<Sender<(String, bool)>>,
    receiver: Option<Receiver<Result<String, String>>>,
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
                
                // Set write timeout as well
                if let Err(e) = stream.set_write_timeout(Some(Duration::from_secs(2))) {
                    println!("Warning: Failed to set write timeout: {}", e);
                }
                
                // Set non-blocking mode
                if let Err(e) = stream.set_nonblocking(true) {
                    println!("Warning: Failed to set non-blocking mode: {}", e);
                }
                
                println!("Connected to server at {}:{}", SERVER_IP, SERVER_PORT);
                self.stream = Some(stream);
                
                // Setup communication channels for the background thread
                let (tx, rx) = channel::<(String, bool)>();
                let (response_tx, response_rx) = channel::<Result<String, String>>();
                
                let mut stream_clone = self.stream.as_ref().unwrap().try_clone()
                    .map_err(|e| format!("Failed to clone stream: {}", e))?;
                
                // Start background thread for handling stream communication
                thread::spawn(move || {
                    while let Ok((cmd, expect_response)) = rx.recv() {
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
                        
                        // If we don't expect a response, return success immediately
                        if !expect_response {
                            println!("Command sent, no response expected");
                            let _ = response_tx.send(Ok("Command sent (no response expected)".to_string()));
                            continue;
                        }
                        
                        // Wait a bit for server to process
                        thread::sleep(Duration::from_millis(200));
                        
                        // Read response only if we expect one
                        let mut buffer = [0; BUFFER_SIZE];
                        let mut response = String::new();
                        
                        // Set a timeout for reading the response
                        let timeout = Duration::from_millis(300); // Increase timeout for slow responses
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
                                    break;
                                }
                            }
                        }
                    }
                    println!("Connection handler thread terminated");
                });
                
                self.sender = Some(tx);
                self.receiver = Some(response_rx);
                Ok(())
            },
            Err(e) => Err(format!("Failed to connect to server: {}", e)),
        }
    }
    
    fn send_command(&mut self, command: String, expect_response: bool) -> Result<String, String> {
        self.ensure_connected()?;
        
        let sender = self.sender.as_ref().unwrap();
        
        // Check if this is a Last or Get command that will need special handling
        let is_track_command = command.trim_end().starts_with("Last") || command.trim_end().starts_with("Get");
        let user_id = if is_track_command {
            // Extract the user_id from the command (Last X or Get X)
            command.trim_end().split_whitespace().nth(1).and_then(|s| s.parse::<u8>().ok())
        } else {
            None
        };
        
        // Send the command and whether to expect a response
        if let Err(e) = sender.send((command, expect_response)) {
            return Err(format!("Failed to send command to thread: {}", e));
        }
        
        // If we don't expect a response, return success immediately
        if !expect_response {
            // We still wait for acknowledgment from the background thread
            match self.receiver.as_ref().unwrap().recv() {
                Ok(result) => result,
                Err(e) => Err(format!("Failed to receive acknowledgment: {}", e)),
            }
        } else if is_track_command && user_id.is_some() {
            // Rest of the function for track commands...
            let receiver = self.receiver.as_ref().unwrap();
            let mut complete_response = String::new();
            let end_marker = format!("End ({})", user_id.unwrap());
            
            loop {
                match receiver.recv() {
                    Ok(result) => match result {
                        Ok(chunk) => {
                            complete_response.push_str(&chunk);
                            
                            if complete_response.contains(&end_marker) {
                                if let Some(end_pos) = complete_response.find(&end_marker) {
                                    complete_response.truncate(end_pos);
                                    complete_response = complete_response.trim_end().to_string();
                                }
                                break;
                            }
                            
                            println!("Partial data received, continuing to read...");
                            
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
            
            Ok(complete_response)
        } else {
            // For normal commands, just return the single response
            match self.receiver.as_ref().unwrap().recv() {
                Ok(result) => result,
                Err(e) => Err(format!("Failed to receive response from thread: {}", e)),
            }
        }
    }
    
    // Check if connection is still alive and reset if needed
    fn is_connection_alive(&mut self) -> bool {
        if let Some(stream) = &mut self.stream {
            // Try a non-blocking peek to see if the connection is still valid
            let mut buf = [0; 1];
            match stream.peek(&mut buf) {
                Ok(_) => return true,
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => return true,
                Err(_) => {
                    println!("Connection appears to be dead, will reconnect");
                    self.stream = None;
                    self.sender = None;
                    self.receiver = None;
                    return false;
                }
            }
        }
        false
    }

    // Enhanced ensure_connected with better recovery
    fn ensure_connected(&mut self) -> Result<(), String> {
        if self.stream.is_none() || self.sender.is_none() || self.receiver.is_none() || !self.is_connection_alive() {
            // Implement exponential backoff for reconnection attempts
            let mut retry_count = 0;
            let max_retries = 3;
            
            while retry_count < max_retries {
                match self.connect() {
                    Ok(_) => return Ok(()),
                    Err(e) => {
                        retry_count += 1;
                        let backoff = std::cmp::min(1000 * 2_u64.pow(retry_count), 5000);
                        println!("Connection attempt {} failed: {}. Retrying in {}ms", 
                                retry_count, e, backoff);
                        thread::sleep(Duration::from_millis(backoff));
                    }
                }
            }
            return Err("Failed to connect after multiple attempts".to_string());
        }
        Ok(())
    }
}

// Safe to share across threads
type SharedConnection = Arc<Mutex<TcpConnection>>;

struct AppState {
    connection: SharedConnection,
    data_streamer: Arc<Mutex<DataStreamerConnection>>,
}

// Data Streamer commands
#[command]
fn start_data_streamer(ip: String, port: u16, state: State<AppState>) -> Result<String, String> {
    let mut data_streamer = state.data_streamer.lock().unwrap();
    data_streamer.start_listening(ip.clone(), port, state.connection.clone())?;
    Ok(format!("Data streamer listening on {}:{}", ip, port))
}

#[command]
fn stop_data_streamer(state: State<AppState>) -> Result<String, String> {
    let mut data_streamer = state.data_streamer.lock().unwrap();
    data_streamer.stop_listening();
    Ok("Data streamer stopped".to_string())
}

#[command]
fn is_user_initialized(user_id: u8, state: State<AppState>) -> bool {
    let streamer_lock = state.data_streamer.lock().unwrap();
    let initialized_ops_lock = streamer_lock.initialized_operators.lock().unwrap();
    let is_initialized = initialized_ops_lock.contains(&user_id);
    
    // Add detailed logging
    println!("Checking if user {} is initialized: {} (initialized_operators: {:?})", 
             user_id, is_initialized, *initialized_ops_lock);
    
    is_initialized
}

// Add this command to your Rust code
#[command]
fn check_connection_health(state: State<AppState>) -> bool {
    let mut connection = state.connection.lock().unwrap();
    if !connection.is_connection_alive() {
        println!("Connection check detected dead connection, attempting to reconnect");
        match connection.ensure_connected() {
            Ok(_) => {
                println!("Successfully reconnected");
                true
            },
            Err(e) => {
                println!("Failed to reconnect: {}", e);
                false
            }
        }
    } else {
        true
    }
}

// AriannaSrv commands that use the helper functions
#[command]
fn initialize_user(user_id: u8, state: State<AppState>) -> Result<String, String> {
    let mut connection = state.connection.lock().unwrap();
    send_init_command(user_id, &mut connection)
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
    state: State<SharedConnection>
) -> Result<String, String> {
    let mut connection = state.inner().lock().unwrap();
    send_set_parameters_command(
        user_id, offset_x, offset_y, north_orientation, track_compensation,
        internal_param, track_type, start_latitude, start_longitude, &mut connection
    )
}

#[command]
fn set_message(message: String, state: State<AppState>) -> Result<String, String> {
    let mut connection = state.connection.lock().unwrap();
    send_set_message_command(message, &mut connection)
}

#[command]
fn clear_user(user_id: u8, state: State<AppState>) -> Result<String, String> {
    let command = format!("Clear {}\n", user_id);
    let mut connection = state.connection.lock().unwrap();
    connection.send_command(command, false)
}

#[command]
fn clear_all(state: State<AppState>) -> Result<String, String> {
    let mut connection = state.connection.lock().unwrap();
    connection.send_command("ClearAll\n".to_string(), false)
}

#[command]
fn fetch_all_position(user_id: u8, state: State<AppState>) -> Result<String, String> {
    let command = format!("Get {}\n", user_id);
    let mut connection = state.connection.lock().unwrap();
    connection.send_command(command, true)
}

#[command]
fn fetch_last_position(user_id: u8, state: State<AppState>) -> Result<String, String> {
    let command = format!("Last {}\n", user_id);
    let mut connection = state.connection.lock().unwrap();
    connection.send_command(command, true)
}

fn main() {
    // Create a shared connection
    let connection = Arc::new(Mutex::new(TcpConnection::new()));
    
    // Create a data streamer connection
    let data_streamer = Arc::new(Mutex::new(DataStreamerConnection::new()));
    
    // Try to connect initially (optional)
    if let Err(e) = connection.lock().unwrap().connect() {
        println!("Initial connection failed: {}. Will retry when needed.", e);
    }
    
    tauri::Builder::default()
        .manage(AppState { 
            connection,
            data_streamer 
        })
        .invoke_handler(tauri::generate_handler![
            initialize_user,
            set_parameters,
            clear_user,
            clear_all,
            set_message,
            fetch_all_position,
            fetch_last_position,
            start_data_streamer,
            stop_data_streamer,
            is_user_initialized,
            check_connection_health
        ])
        .setup(|_app| {
            // Optionally set up a reconnection timer or other initialization
            Ok(())
        })
        .on_window_event(|event| {
            // Clean up connection when app is closed
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                println!("Application closing, cleaning up connections...");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}