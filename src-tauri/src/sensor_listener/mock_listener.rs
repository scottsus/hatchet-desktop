use std::sync::Arc;
use super::traits::SensorListener;

pub struct MockSensorListener {
    is_running: bool,
    callback: Option<Arc<dyn Fn(String) + Send + Sync>>,
}

impl MockSensorListener {
    pub fn new() -> Self {
        Self {
            is_running: false,
            callback: None,
        }
    }
}

impl SensorListener for MockSensorListener {
    fn start_listening(&mut self, _ip: String, _port: u16) -> Result<(), String> {
        self.is_running = true;
        Ok(())
    }
    
    fn stop_listening(&mut self) {
        self.is_running = false;
    }
    
    fn is_running(&self) -> bool {
        self.is_running
    }
    
    fn set_data_callback(&mut self, callback: Arc<dyn Fn(String) + Send + Sync>) {
        self.callback = Some(callback);
    }
}