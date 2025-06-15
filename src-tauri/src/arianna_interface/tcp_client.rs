use std::net::TcpStream;
use std::io::{Write, Read, ErrorKind};
use std::time::Duration;
use super::traits::{AriannaInterface, SetParametersRequest};

pub struct TcpAriannaInterface {
    host: String,
    port: u16,
    stream: Option<TcpStream>,
}

impl TcpAriannaInterface {
    pub fn new(host: &str, port: u16) -> Self {
        Self {
            host: host.to_string(),
            port,
            stream: None,
        }
    }
    
    fn ensure_connected(&mut self) -> Result<(), String> {
        if self.stream.is_none() {
            self.connect()?;
        }
        Ok(())
    }
    
    fn send_command(&mut self, command: &str, expect_response: bool) -> Result<String, String> {
        self.ensure_connected()?;
        
        let stream = match &mut self.stream {
            Some(s) => s,
            None => return Err("Not connected to server".to_string()),
        };
        
        // Send command
        println!("Sending command: {}", command);
        let command_with_newline = format!("{}\n", command);
        match stream.write_all(command_with_newline.as_bytes()) {
            Ok(_) => {},
            Err(e) => {
                // Connection might be broken, reset it
                self.stream = None;
                return Err(format!("Failed to send command: {}", e));
            }
        }
        
        match stream.flush() {
            Ok(_) => {},
            Err(e) => {
                self.stream = None;
                return Err(format!("Failed to flush stream: {}", e));
            }
        }
        
        // If no response is expected, return success
        if !expect_response {
            return Ok("Command sent (no response expected)".to_string());
        }
        
        // Read response
        let mut response_buffer = [0u8; 1024];
        let response_bytes_read = match stream.read(&mut response_buffer) {
            Ok(n) => n,
            Err(e) => {
                self.stream = None;
                return Err(format!("Failed to read response: {}", e));
            }
        };
        
        if response_bytes_read == 0 {
            // Connection closed by server
            self.stream = None;
            return Err("Server closed connection".to_string());
        }
        
        let response_data = &response_buffer[..response_bytes_read];
        let response = String::from_utf8_lossy(response_data);
        
        Ok(response.trim().to_string())
    }
}

impl AriannaInterface for TcpAriannaInterface {
    fn connect(&mut self) -> Result<(), String> {
        // Close existing connection if any
        self.stream = None;
        
        let address = format!("{}:{}", self.host, self.port);
        println!("Connecting to Arianna server at {}", address);
        
        let stream = match TcpStream::connect_timeout(
            &address.parse().map_err(|e| format!("Invalid address: {}", e))?,
            Duration::from_secs(5)
        ) {
            Ok(s) => s,
            Err(e) => {
                return Err(format!("Failed to connect to Arianna server: {}", e));
            }
        };
        
        // Set timeouts
        let mut stream = match stream.set_read_timeout(Some(Duration::from_secs(10))) {
            Ok(_) => stream,
            Err(e) => return Err(format!("Failed to set read timeout: {}", e)),
        };
        
        stream = match stream.set_write_timeout(Some(Duration::from_secs(5))) {
            Ok(_) => stream,
            Err(e) => return Err(format!("Failed to set write timeout: {}", e)),
        };
        
        println!("Connected to Arianna server");
        self.stream = Some(stream);
        Ok(())
    }
    
    fn is_connected(&self) -> bool {
        if let Some(ref stream) = self.stream {
            // Check if connection is still valid
            let mut peek_buf = [0u8; 1];
            match stream.peek(&mut peek_buf) {
                Ok(_) => true,
                Err(e) => match e.kind() {
                    // These errors indicate the connection is still open
                    ErrorKind::WouldBlock | ErrorKind::Interrupted => true,
                    // Any other error means the connection is broken
                    _ => false,
                }
            }
        } else {
            false
        }
    }
    
    
    fn init(&mut self, user_id: u8) -> Result<String, String> {
        let command = format!("Init {}", user_id);
        let response = self.send_command(&command, false)?;
        println!("Init {}: {}", user_id, response);
        Ok(response)
    }
    
    fn set_parameters(&mut self, params: SetParametersRequest) -> Result<String, String> {
        let command = format!(
            "SetParameters {},{},{},{},{},{},{},{},{}",
            params.user_id,
            params.offset_x,
            params.offset_y,
            params.north_orientation,
            params.track_compensation,
            params.internal_param,
            params.track_type,
            params.start_latitude,
            params.start_longitude
        );
        let response = self.send_command(&command, false)?;
        println!("SetParameters {}: {}", params.user_id, response);
        Ok(response)
    }
    
    fn clear(&mut self, user_id: u8) -> Result<String, String> {
        let command = format!("Clear {}", user_id);
        let response = self.send_command(&command, false)?;
        println!("Clear {}: {}", user_id, response);
        Ok(response)
    }
    
    fn clear_all(&mut self) -> Result<String, String> {
        let command = "ClearAll";
        let response = self.send_command(command, false)?;
        println!("ClearAll: {}", response);
        Ok(response)
    }
    
    fn set(&mut self, _user_id: u8, message: String) -> Result<String, String> {
        let command = format!("Set {}", message);
        let response = self.send_command(&command, false)?;
        if response.starts_with("OK") {
            println!("Set data: {}", response);
        } else {
            println!("Set error: {}", response);
        }
        Ok(response)
    }
    
    fn get(&mut self, user_id: u8) -> Result<String, String> {
        let command = format!("Get {}", user_id);
        let response = self.send_command(&command, true)?;
        println!("Get {}: {}", user_id, response);
        Ok(response)
    }
    
    fn last(&mut self, user_id: u8) -> Result<String, String> {
        let command = format!("Last {}", user_id);
        let response = self.send_command(&command, true)?;
        println!("Last {}: {}", user_id, response);
        Ok(response)
    }
    
    fn wayback(&mut self, user_id: u8, _len: u32, _start_idx: u32, _end_idx: u32) -> Result<String, String> {
        let command = format!("Wayback {} {} {} {}", user_id, _len, _start_idx, _end_idx);
        let response = self.send_command(&command, false)?;
        println!("Wayback {}: {}", user_id, response);
        Ok(response)
    }
}