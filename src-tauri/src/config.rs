
pub const KNOWN_USER_IDS: &[u8] = &[89, 69];

#[derive(Debug, Clone)]
pub struct SensorServiceConfig {
    pub use_mock_listener: bool,
    pub use_mock_arianna: bool,
    pub listener_ip: String,
    pub listener_port: u16,
    pub arianna_host: String,
    pub arianna_port: u16,
}

impl Default for SensorServiceConfig {
    fn default() -> Self {
        Self {
            use_mock_listener: false,
            use_mock_arianna: false,
            listener_ip: "127.0.0.1".to_string(),
            listener_port: 5050,
            arianna_host: "127.0.0.1".to_string(),
            arianna_port: 8000,
        }
    }
}
