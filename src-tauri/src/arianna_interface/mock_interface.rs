use std::fs::File;
use std::io::{BufRead, BufReader};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use super::traits::{AriannaInterface, SetParametersRequest};

pub struct MockAriannaInterface {
    replay_data: Vec<String>,
    current_index: Mutex<usize>,
    connected: bool,
    last_update_time: Mutex<Instant>,
}

impl MockAriannaInterface {
    pub fn new(_replay_data_path: &str) -> Self {
        let mut replay_data = Vec::new();
        
        let paths = [
            "../tests/Mock_Server_Output_Mode1_Home.txt",
            "../tests/Mock_Server_Output_User69.txt",
        ];
        
        for path in &paths {
            if let Ok(data) = Self::load_replay_data(path) {
                replay_data.extend(data);
            }
        }
        
        Self {
            replay_data,
            current_index: Mutex::new(0),
            connected: false,
            last_update_time: Mutex::new(Instant::now()),
        }
    }
    
    fn load_replay_data(path: &str) -> Result<Vec<String>, String> {
        let file = File::open(path)
            .map_err(|e| format!("Failed to open replay data file: {}", e))?;
        
        let reader = BufReader::new(file);
        let data: Vec<String> = reader.lines()
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to read replay data: {}", e))?;
        
        Ok(data)
    }
    
    fn get_data_for_user(&self, user_id: u8) -> Option<String> {
        let user_data: Vec<&String> = self.replay_data.iter()
            .filter(|line| line.starts_with(&format!("{}:", user_id)))
            .collect();
        
        if user_data.is_empty() {
            return None;
        }
        
        let current_index = self.current_index.lock().unwrap();
        let index = *current_index % user_data.len();
        Some(user_data[index].clone())
    }
    
    fn advance_data_index(&self) {
        if !self.replay_data.is_empty() {
            let mut current_index = self.current_index.lock().unwrap();
            *current_index = (*current_index + 1) % self.replay_data.len();
        }
    }
}

impl AriannaInterface for MockAriannaInterface {
    fn connect(&mut self) -> Result<(), String> {
        self.connected = true;
        Ok(())
    }
    
    fn is_connected(&self) -> bool {
        self.connected
    }
    
    fn init(&mut self, user_id: u8) -> Result<String, String> {
        Ok(format!("Mock: Init {} completed", user_id))
    }
    
    fn set_parameters(&mut self, params: SetParametersRequest) -> Result<String, String> {
        Ok(format!("Mock: SetParameters {} completed", params.user_id))
    }
    
    fn clear(&mut self, user_id: u8) -> Result<String, String> {
        Ok(format!("Mock: Clear {} completed", user_id))
    }
    
    fn clear_all(&mut self) -> Result<String, String> {
        Ok("Mock: ClearAll completed".to_string())
    }
    
    fn set(&mut self, _user_id: u8, _message: String) -> Result<String, String> {
        Ok("Mock: Set completed".to_string())
    }
    
    fn get(&mut self, user_id: u8) -> Result<String, String> {
        let user_data: Vec<String> = self.replay_data.iter()
            .filter(|line| line.starts_with(&format!("{}:", user_id)))
            .cloned()
            .collect();
        
        if user_data.is_empty() {
            Err("No data available for user".to_string())
        } else {
            Ok(user_data.join("\n"))
        }
    }
    
    fn last(&mut self, user_id: u8) -> Result<String, String> {
        let now = Instant::now();
        let mut last_update = self.last_update_time.lock().unwrap();
        
        if now.duration_since(*last_update) >= Duration::from_millis(50) {
            *last_update = now;
            drop(last_update);
            self.advance_data_index();
        }
        
        self.get_data_for_user(user_id)
            .ok_or_else(|| "No data available for user".to_string())
    }
    
    fn wayback(&mut self, user_id: u8, _len: u32, _start_idx: u32, _end_idx: u32) -> Result<String, String> {
        Ok(format!("Mock: Wayback {} response", user_id))
    }
}