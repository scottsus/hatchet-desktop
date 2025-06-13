use std::sync::{Arc, Mutex};
use std::collections::HashSet;
use crate::config::{SensorServiceConfig, KNOWN_USER_IDS};
use crate::sensor_listener::{SensorListener, TcpSensorListener, MockSensorListener};
use crate::arianna_interface::{AriannaInterface, TcpAriannaInterface, MockAriannaInterface, SetParametersRequest};

pub struct SensorService {
    listener: Arc<Mutex<Box<dyn SensorListener>>>,
    arianna: Arc<Mutex<Box<dyn AriannaInterface>>>,
    initialized_operators: Arc<Mutex<HashSet<u8>>>,
    active_users: Arc<Mutex<HashSet<u8>>>,
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
            Box::new(MockAriannaInterface::new(""))
        } else {
            Box::new(TcpAriannaInterface::new(&config.arianna_host, config.arianna_port))
        };
        
        Self {
            listener: Arc::new(Mutex::new(listener)),
            arianna: Arc::new(Mutex::new(arianna)),
            initialized_operators: Arc::new(Mutex::new(HashSet::new())),
            active_users: Arc::new(Mutex::new(HashSet::new())),
            config,
        }
    }
    
    pub fn start(&self) -> Result<(), String> {
        let mut arianna = self.arianna.lock().unwrap();
        arianna.connect()?;
        
        let mut listener = self.listener.lock().unwrap();
        
        let arianna_clone = self.arianna.clone();
        let initialized_ops_clone = self.initialized_operators.clone();
        let active_users_clone = self.active_users.clone();
        
        listener.set_data_callback(Arc::new(move |data| {
            Self::handle_sensor_data(data, arianna_clone.clone(), initialized_ops_clone.clone(), active_users_clone.clone());
        }));
        
        listener.start_listening(self.config.listener_ip.clone(), self.config.listener_port)?;
        
        Ok(())
    }
    
    pub fn stop(&self) {
        let mut listener = self.listener.lock().unwrap();
        listener.stop_listening();
    }
    
    pub fn is_user_initialized(&self, user_id: u8) -> bool {
        if self.config.use_mock_arianna && KNOWN_USER_IDS.contains(&user_id) {
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
    
    pub fn set_global_parameters(
        &self,
        offset_x: f64,
        offset_y: f64,
        north_orientation: f64,
        start_latitude: f64,
        start_longitude: f64,
    ) -> Result<String, String> {
        let mut arianna = self.arianna.lock().unwrap();
        let mut results = Vec::new();
        
        // Apply parameters to all known user IDs
        for &user_id in KNOWN_USER_IDS {
            let params = SetParametersRequest {
                user_id,
                offset_x,
                offset_y,
                north_orientation,
                track_compensation: 0.0,
                internal_param: 0.0,
                track_type: 4, // User corrected track
                start_latitude,
                start_longitude,
            };
            
            match arianna.set_parameters(params) {
                Ok(response) => {
                    results.push(format!("User {}: {}", user_id, response));
                }
                Err(e) => {
                    results.push(format!("User {} failed: {}", user_id, e));
                }
            }
        }
        
        Ok(format!("Global parameters updated:\n{}", results.join("\n")))
    }
    
    fn handle_sensor_data(
        data: String,
        arianna: Arc<Mutex<Box<dyn AriannaInterface>>>,
        initialized_operators: Arc<Mutex<HashSet<u8>>>,
        active_users: Arc<Mutex<HashSet<u8>>>,
    ) {
        // Handle hex data format - use the hex prefix to determine user ID
        if data.starts_with('#') {
            if let Some(hex_op_id) = data.get(1..3) {
                if let Ok(operator_id) = u8::from_str_radix(hex_op_id, 16) {
                    // Check if this user is already initialized
                    let ops = initialized_operators.lock().unwrap();
                    let is_initialized = ops.contains(&operator_id);
                    drop(ops);
                    
                    if !is_initialized {
                        println!("New user detected from hex data: {}", operator_id);
                        Self::initialize_user(operator_id, arianna.clone(), initialized_operators.clone());
                        
                        // Add to active users
                        let mut users = active_users.lock().unwrap();
                        users.insert(operator_id);
                        drop(users);
                    }
                    
                    // Process the hex data for this user
                    Self::process_user_data(operator_id, data, arianna, initialized_operators);
                } else {
                    println!("Failed to parse operator ID from hex: '{}'", hex_op_id);
                }
            }
        }
    }
    
    fn process_user_data(
        operator_id: u8,
        data: String,
        arianna: Arc<Mutex<Box<dyn AriannaInterface>>>,
        initialized_operators: Arc<Mutex<HashSet<u8>>>,
    ) {
        // Check if user is initialized before processing data
        let ops = initialized_operators.lock().unwrap();
        if !ops.contains(&operator_id) {
            drop(ops);
            println!("Received hex data for uninitialized user: {}", operator_id);
            return;
        }
        drop(ops);
        
        let mut arianna = arianna.lock().unwrap();
        match arianna.set(operator_id, data.clone()) {
            Ok(response) => println!("Hex data: {}", response),
            Err(e) => println!("Failed to set data for user {}: {}", operator_id, e),
        }
    }
    
    fn initialize_user(
        user_id: u8,
        arianna: Arc<Mutex<Box<dyn AriannaInterface>>>,
        initialized_operators: Arc<Mutex<HashSet<u8>>>,
    ) {
        if let Ok(mut arianna_guard) = arianna.lock() {
            match arianna_guard.init(user_id) {
                Ok(_) => {
                    // After a successful Init, send default SetParameters
                    let params = SetParametersRequest {
                        user_id,
                        offset_x: 0.0,
                        offset_y: 0.0,
                        north_orientation: 0.0,
                        track_compensation: 0.0,
                        internal_param: 0.0,
                        track_type: 4,      // user-corrected track
                        start_latitude: 0.0,
                        start_longitude: 0.0,
                    };

                    match arianna_guard.set_parameters(params) {
                        Ok(_) => {
                            // Only mark user as initialized if both calls succeed
                            let mut initialized = initialized_operators.lock().unwrap();
                            initialized.insert(user_id);
                        }
                        Err(e) => println!(
                            "Failed to set parameters for user {}: {}",
                            user_id, e
                        ),
                    }
                }
                Err(e) => println!("Failed to initialize user {}: {}", user_id, e),
            }
        }
    }
}
