#ifndef ARIANNA_PROCESSOR_H
#define ARIANNA_PROCESSOR_H

#include <string>
#include <vector>

namespace arianna {

struct Coordinate {
    double x;
    double y;
};

struct ProcessorConfig {
    std::string library_path;         // Path to libarianna.so
    int operator_id;                  // Operator ID for Arianna functions
    float x0;                         // X offset of the starting point in meters
    float y0;                         // Y offset of the starting point in meters
    float rotation;                   // Track rotation in radiants
    float correction_t;               // Correction T (small values usually in a range close to 1e-5)
    float correction_w;               // Correction W (usually 0)
    double start_latitude;            // Starting latitude for GPS coordinates
    double start_longitude;           // Starting longitude for GPS coordinates
    bool use_lat_long;                // Whether to use lat/long coordinates or meters

    ProcessorConfig() :
        library_path("./lib/libarianna.so"),
        operator_id(1),
        x0(0.0f),
        y0(0.0f),
        rotation(0.0f),
        correction_t(0.0f),
        correction_w(0.0f),
        start_latitude(47.615030999999995),  // Default to Bellevue
        start_longitude(-122.177495),        // Default to Bellevue
        use_lat_long(true) {}
};

struct ProcessorResult {
    int status;                 // 0 for success, non-zero for error
    int version;                // Version of libarianna.so
    int step_count;             // Number of steps processed
    int message_count;          // Number of messages processed
    std::string error_message;  // Error message if status is non-zero
    std::vector<Coordinate> coordinates; // Processed coordinates
};

/**
 * RAII class for Arianna processor
 */
class AriannaProcessor {
public:
    /**
     * Constructor - initializes the Arianna processor
     * 
     * @throws std::runtime_error if initialization fails
     */
    AriannaProcessor();
    
    /**
     * Destructor - automatically cleans up all resources
     */
    ~AriannaProcessor();
    
    /**
     * Process Arianna hex data
     *
     * @param hex_data Vector of hex data strings (each starting with #)
     * @param config Configuration for processing
     * @return Result of processing
     */
    ProcessorResult process(
        const std::vector<std::string>& hex_data,
        const ProcessorConfig& config = ProcessorConfig()
    );
    
    // Prevent copying and assignment
    AriannaProcessor(const AriannaProcessor&) = delete;
    AriannaProcessor& operator=(const AriannaProcessor&) = delete;
};

// Legacy functions - kept for backward compatibility
/**
 * Initialize the Arianna processor library
 *
 * @return 0 on success, non-zero on error
 */
int initialize();

/**
 * Process Arianna hex data
 *
 * @param hex_data Vector of hex data strings (each starting with #)
 * @param config Configuration for processing
 * @return Result of processing
 */
ProcessorResult process(
    const std::vector<std::string>& hex_data,
    const ProcessorConfig& config = ProcessorConfig()
);

/**
 * Clean up resources used by the Arianna processor
 *
 * @param operator_id Operator ID to clean up
 * @return 0 on success, non-zero on error
 */
int cleanup(int operator_id);

/**
 * Clean up all resources used by the Arianna processor
 *
 * @return 0 on success, non-zero on error
 */
int cleanup_all();

} // namespace arianna

#endif // ARIANNA_PROCESSOR_H
