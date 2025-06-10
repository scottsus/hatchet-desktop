use std::env;

pub const DEFAULT_TEST_USER_ID: u8 = 89;

#[derive(Debug, Clone)]
pub struct SensorServiceConfig {
    pub use_mock_listener: bool,
    pub use_mock_arianna: bool,
    pub listener_ip: String,
    pub listener_port: u16,
    pub arianna_host: String,
    pub arianna_port: u16,
    pub replay_data_path: String,
}

impl Default for SensorServiceConfig {
    fn default() -> Self {
        Self {
            use_mock_listener: false,
            use_mock_arianna: false,
            listener_ip: "127.0.0.1".to_string(),
            listener_port: 5050,
            arianna_host: "127.0.0.1".to_string(),
            arianna_port: 5051,
            replay_data_path: "../tests/Mock_Server_Output_Mode1_Home.txt".to_string(),
        }
    }
}

impl SensorServiceConfig {
    pub fn from_env() -> Self {
        Self {
            use_mock_listener: env::var("USE_MOCK_LISTENER")
                .unwrap_or_default()
                .parse()
                .unwrap_or(false),
            use_mock_arianna: env::var("USE_MOCK_ARIANNA")
                .unwrap_or_default()
                .parse()
                .unwrap_or(false),
            listener_ip: env::var("LISTENER_IP")
                .unwrap_or_else(|_| "127.0.0.1".to_string()),
            listener_port: env::var("LISTENER_PORT")
                .unwrap_or_else(|_| "5050".to_string())
                .parse()
                .unwrap_or(5050),
            arianna_host: env::var("ARIANNA_HOST")
                .unwrap_or_else(|_| "127.0.0.1".to_string()),
            arianna_port: env::var("ARIANNA_PORT")
                .unwrap_or_else(|_| "5051".to_string())
                .parse()
                .unwrap_or(5051),
            replay_data_path: env::var("REPLAY_DATA_PATH")
                .unwrap_or_else(|_| "../tests/Mock_Server_Output_Mode1_Home.txt".to_string()),
        }
    }
}