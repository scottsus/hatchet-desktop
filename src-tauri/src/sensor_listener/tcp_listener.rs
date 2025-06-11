use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::net::TcpListener;
use std::io::Read;
use std::thread;
use std::time::Duration;
use super::traits::SensorListener;

pub struct TcpSensorListener {
    is_running: Arc<AtomicBool>,
    callback: Option<Arc<dyn Fn(String) + Send + Sync>>,
}

impl TcpSensorListener {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            callback: None,
        }
    }
}

impl SensorListener for TcpSensorListener {
    fn start_listening(&mut self, ip: String, port: u16) -> Result<(), String> {
        if self.is_running.load(Ordering::SeqCst) {
            return Ok(());
        }

        let address = format!("{}:{}", ip, port);
        let listener = TcpListener::bind(&address)
            .map_err(|e| format!("Failed to bind to {}: {}", address, e))?;

        listener.set_nonblocking(true)
            .map_err(|e| format!("Failed to set non-blocking: {}", e))?;

        self.is_running.store(true, Ordering::SeqCst);
        
        let is_running = self.is_running.clone();
        let callback = self.callback.clone();
        
        thread::spawn(move || {
            println!("TCP sensor listener started on {}", address);
            
            while is_running.load(Ordering::SeqCst) {
                match listener.accept() {
                    Ok((mut stream, addr)) => {
                        println!("Sensor connected: {}", addr);
                        
                        let callback_clone = callback.clone();
                        let is_running_clone = is_running.clone();
                        
                        thread::spawn(move || {
                            let mut buffer = [0; 1024];
                            
                            while is_running_clone.load(Ordering::SeqCst) {
                                match stream.read(&mut buffer) {
                                    Ok(0) => {
                                        println!("Sensor connection closed");
                                        break;
                                    },
                                    Ok(bytes_read) => {
                                        let data = String::from_utf8_lossy(&buffer[..bytes_read]);
                                        
                                        for line in data.lines() {
                                            if !line.trim().is_empty() {
                                                println!("Data: [{}]", line);
                                                if let Some(ref cb) = callback_clone {
                                                    cb(line.to_string());
                                                }
                                            }
                                        }
                                    },
                                    Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock
                                              || e.kind() == std::io::ErrorKind::TimedOut => {
                                        thread::sleep(Duration::from_millis(50));
                                    },
                                    Err(e) => {
                                        println!("Error reading from sensor: {}", e);
                                        break;
                                    }
                                }
                            }
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
            println!("TCP sensor listener stopped");
        });
        
        Ok(())
    }
    
    fn stop_listening(&mut self) {
        self.is_running.store(false, Ordering::SeqCst);
    }
    
    fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }
    
    fn set_data_callback(&mut self, callback: Arc<dyn Fn(String) + Send + Sync>) {
        self.callback = Some(callback);
    }
}