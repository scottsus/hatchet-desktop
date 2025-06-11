use std::net::TcpStream;
use std::io::{Write, Read};
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
    
    fn send_command(&mut self, command: &str) -> Result<String, String> {
        // Create a fresh connection for each command since server closes after each response
        let address = format!("{}:{}", self.host, self.port);
        
        let mut stream = TcpStream::connect_timeout(
            &address.parse().map_err(|e| format!("Invalid address: {}", e))?,
            Duration::from_secs(5)
        ).map_err(|e| format!("Failed to connect to Arianna server: {}", e))?;
        
        // Set timeouts
        stream.set_read_timeout(Some(Duration::from_secs(10)))
            .map_err(|e| format!("Failed to set read timeout: {}", e))?;
        stream.set_write_timeout(Some(Duration::from_secs(5)))
            .map_err(|e| format!("Failed to set write timeout: {}", e))?;
        
        // Send command immediately (no handshake needed)
        let command_with_newline = format!("{}\n", command);
        stream.write_all(command_with_newline.as_bytes())
            .map_err(|e| format!("Failed to send command: {}", e))?;
        
        stream.flush()
            .map_err(|e| format!("Failed to flush stream: {}", e))?;
        
        // Read response
        let mut response_buffer = [0u8; 1024];
        let response_bytes_read = stream.read(&mut response_buffer)
            .map_err(|e| format!("Failed to read response: {}", e))?;
        
        let response_data = &response_buffer[..response_bytes_read];
        let response = String::from_utf8_lossy(response_data);
        
        Ok(response.trim().to_string())
    }
}

impl AriannaInterface for TcpAriannaInterface {
    fn connect(&mut self) -> Result<(), String> {
        // Test connection
        let address = format!("{}:{}", self.host, self.port);
        println!("Connecting to Arianna server at {}", address);
        
        match TcpStream::connect_timeout(
            &address.parse().map_err(|e| format!("Invalid address: {}", e))?,
            Duration::from_secs(5)
        ) {
            Ok(_) => {
                println!("Connected to Arianna server");
                Ok(())
            }
            Err(e) => {
                Err(format!("Failed to connect to Arianna server: {}", e))
            }
        }
    }
    
    fn is_connected(&self) -> bool {
        // Since we use fresh connections, always return true if we can connect
        true
    }
    
    fn init(&mut self, user_id: u8) -> Result<String, String> {
        let command = format!("Init {}", user_id);
        let response = self.send_command(&command)?;
        println!("Init {}: {}", user_id, response);
        Ok(response)
    }
    
    fn set_parameters(&mut self, params: SetParametersRequest) -> Result<String, String> {
        let command = format!(
            "SetParameters {} {} {} {} {} {} {} {} {}",
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
        let response = self.send_command(&command)?;
        println!("SetParameters {}: {}", params.user_id, response);
        Ok(response)
    }
    
    fn clear(&mut self, user_id: u8) -> Result<String, String> {
        let command = format!("Clear {}", user_id);
        let response = self.send_command(&command)?;
        println!("Clear {}: {}", user_id, response);
        Ok(response)
    }
    
    fn clear_all(&mut self) -> Result<String, String> {
        let command = "ClearAll";
        let response = self.send_command(command)?;
        println!("ClearAll: {}", response);
        Ok(response)
    }
    
    fn set(&mut self, _user_id: u8, message: String) -> Result<String, String> {
        let command = format!("Set {}", message);
        let response = self.send_command(&command)?;
        if response.starts_with("OK") {
            println!("Set data: {}", response);
        } else {
            println!("Set error: {}", response);
        }
        Ok(response)
    }
    
    fn get(&mut self, user_id: u8) -> Result<String, String> {
        let command = format!("Get {}", user_id);
        let response = self.send_command(&command)?;
        println!("Get {}: {}", user_id, response);
        Ok(response)
    }
    
    fn last(&mut self, user_id: u8) -> Result<String, String> {
        let command = format!("Last {}", user_id);
        let response = self.send_command(&command)?;
        println!("Last {}: {}", user_id, response);
        Ok(response)
    }
    
    fn wayback(&mut self, user_id: u8, _len: u32, _start_idx: u32, _end_idx: u32) -> Result<String, String> {
        let command = format!("Wayback {} {} {} {}", user_id, _len, _start_idx, _end_idx);
        let response = self.send_command(&command)?;
        println!("Wayback {}: {}", user_id, response);
        Ok(response)
    }
}