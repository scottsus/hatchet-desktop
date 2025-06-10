#ifndef ARIANNA_BUFFER_H
#define ARIANNA_BUFFER_H

#include "processor.h"
#include <deque>
#include <mutex>
#include <string>

namespace arianna {

/**
 * Buffer class for storing and polling coordinates
 */
class Buffer {
public:

    Buffer(size_t buffer_size = 1000);
    
    ~Buffer();
    
    /**
     * Add coordinates to the buffer
     *
     * @param coordinates Vector of coordinates to add
     * @param hex_data Vector of original hex data strings (optional)
     * @return Number of coordinates added
     */
    size_t addCoordinates(
        const std::vector<Coordinate>& coordinates,
        const std::vector<std::string>& hex_data = std::vector<std::string>()
    );
    
    /**
     * Get the next coordinate from the buffer
     *
     * @param coordinate Reference to a Coordinate to store the next coordinate
     * @param hex_data Reference to a string to store the original hex data (optional)
     * @return true if a coordinate was retrieved, false if the buffer is empty
     */
    bool getNextCoordinate(Coordinate& coordinate, std::string* hex_data = nullptr);
    
    /**
     * Get the number of coordinates currently in the buffer
     *
     * @return Number of coordinates in the buffer
     */
    size_t getBufferSize() const;
    
    /**
     * Check if the buffer is empty
     *
     * @return true if the buffer is empty, false otherwise
     */
    bool isBufferEmpty() const;
    
    /**
     * Clear the buffer
     */
    void clearBuffer();
    
    /**
     * Get the total number of coordinates loaded
     *
     * @return Total number of coordinates loaded
     */
    size_t getTotalCoordinatesLoaded() const;
    
    /**
     * Write coordinates to a file
     *
     * @param output_file Path to the output file
     * @return Number of coordinates written
     */
    size_t writeToFile(const std::string& output_file);

private:
    struct BufferRecord {
        Coordinate coordinate;
        std::string hex_data;
    };

    size_t buffer_size_;
    std::deque<BufferRecord> buffer_;
    size_t total_coordinates_loaded_;
    mutable std::mutex mutex_;
};

} // namespace arianna

#endif // ARIANNA_BUFFER_H
