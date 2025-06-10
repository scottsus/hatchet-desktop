#[derive(Debug, Clone)]
pub struct SetParametersRequest {
    pub user_id: u8,
    pub offset_x: f64,
    pub offset_y: f64,
    pub north_orientation: f64,
    pub track_compensation: f64,
    pub internal_param: f64,
    pub track_type: u8,
    pub start_latitude: f64,
    pub start_longitude: f64,
}

pub trait AriannaInterface: Send + Sync {
    fn connect(&mut self) -> Result<(), String>;
    fn is_connected(&self) -> bool;
    
    fn init(&mut self, user_id: u8) -> Result<String, String>;
    fn set_parameters(&mut self, params: SetParametersRequest) -> Result<String, String>;
    fn clear(&mut self, user_id: u8) -> Result<String, String>;
    fn clear_all(&mut self) -> Result<String, String>;
    fn set(&mut self, user_id: u8, message: String) -> Result<String, String>;
    fn get(&mut self, user_id: u8) -> Result<String, String>;
    fn last(&mut self, user_id: u8) -> Result<String, String>;
    fn wayback(&mut self, user_id: u8, len: u32, start_idx: u32, end_idx: u32) -> Result<String, String>;
}