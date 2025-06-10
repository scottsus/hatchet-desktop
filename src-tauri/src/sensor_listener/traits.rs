use std::sync::Arc;

pub trait SensorListener: Send + Sync {
    fn start_listening(&mut self, ip: String, port: u16) -> Result<(), String>;
    fn stop_listening(&mut self);
    fn is_running(&self) -> bool;
    fn set_data_callback(&mut self, callback: Arc<dyn Fn(String) + Send + Sync>);
}