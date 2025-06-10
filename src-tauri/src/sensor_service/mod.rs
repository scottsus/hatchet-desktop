use std::sync::{Arc, Mutex};
use std::collections::HashSet;
use crate::config::{SensorServiceConfig, DEFAULT_TEST_USER_ID};
use crate::sensor_listener::{SensorListener, TcpSensorListener, MockSensorListener};
use crate::arianna_interface::{AriannaInterface, TcpAriannaInterface, MockAriannaInterface};

pub struct SensorService {
    listener: Arc<Mutex<Box<dyn SensorListener>>>,
    arianna: Arc<Mutex<Box<dyn AriannaInterface>>>,
    initialized_operators: Arc<Mutex<HashSet<u8>>>,
    config: SensorServiceConfig,
}

impl SensorService {
    pub fn new(config: SensorServiceConfig) -> Self {
        let listener: Box<dyn SensorListener> = if config.use_mock_listener {
            Box::new(MockSensorListener::new())
        } else {
            Box::new(TcpSensorListener::new())
        };
        
        let arianna: Box<dyn AriannaInterface> = if config.use_mock_arianna {
            Box::new(MockAriannaInterface::new(&config.replay_data_path))
        } else {
            Box::new(TcpAriannaInterface::new(&config.arianna_host, config.arianna_port))
        };
        
        Self {
            listener: Arc::new(Mutex::new(listener)),
            arianna: Arc::new(Mutex::new(arianna)),
            initialized_operators: Arc::new(Mutex::new(HashSet::new())),
            config,
        }
    }
    
    pub fn start(&self) -> Result<(), String> {
        let mut arianna = self.arianna.lock().unwrap();
        arianna.connect()?;
        
        let mut listener = self.listener.lock().unwrap();
        listener.start_listening(self.config.listener_ip.clone(), self.config.listener_port)?;
        
        let arianna_clone = self.arianna.clone();
        let initialized_ops_clone = self.initialized_operators.clone();
        
        listener.set_data_callback(Arc::new(move |data| {
            Self::handle_sensor_data(data, arianna_clone.clone(), initialized_ops_clone.clone());
        }));
        
        Ok(())
    }
    
    pub fn stop(&self) {
        let mut listener = self.listener.lock().unwrap();
        listener.stop_listening();
    }
    
    pub fn is_user_initialized(&self, user_id: u8) -> bool {
        if self.config.use_mock_arianna && user_id == DEFAULT_TEST_USER_ID {
            return true;
        }
        let ops = self.initialized_operators.lock().unwrap();
        ops.contains(&user_id)
    }
    
    pub fn get_last_position(&self, user_id: u8) -> Result<String, String> {
        let mut arianna = self.arianna.lock().unwrap();
        arianna.last(user_id)
    }
    
    pub fn get_all_positions(&self, user_id: u8) -> Result<String, String> {
        let mut arianna = self.arianna.lock().unwrap();
        arianna.get(user_id)
    }
    
    fn handle_sensor_data(
        data: String,
        arianna: Arc<Mutex<Box<dyn AriannaInterface>>>,
        initialized_operators: Arc<Mutex<HashSet<u8>>>,
    ) {
        if data.starts_with('#') {
            if let Some(hex_op_id) = data.get(1..3) {
                if let Ok(operator_id) = u8::from_str_radix(hex_op_id, 16) {
                    let mut ops = initialized_operators.lock().unwrap();
                    if !ops.contains(&operator_id) {
                        let mut arianna = arianna.lock().unwrap();
                        if let Ok(_) = arianna.init(operator_id) {
                            ops.insert(operator_id);
                        }
                    }
                    drop(ops);
                    
                    let mut arianna = arianna.lock().unwrap();
                    let _ = arianna.set(operator_id, data);
                }
            }
        }
    }
}
