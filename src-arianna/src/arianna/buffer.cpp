#include "buffer.h"
#include <fstream>
#include <iostream>

namespace arianna {

Buffer::Buffer(size_t buffer_size)
    : buffer_size_(buffer_size), total_coordinates_loaded_(0) {
}

Buffer::~Buffer() {
    clearBuffer();
}

size_t Buffer::addCoordinates(const std::vector<Coordinate>& coordinates, const std::vector<std::string>& hex_data) {
    std::lock_guard<std::mutex> lock(mutex_);

    size_t coordinates_added = 0;
    
    for (size_t i = 0; i < coordinates.size() && buffer_.size() < buffer_size_; ++i) {
        BufferRecord record;
        record.coordinate = coordinates[i];
        
        // Store original hex data if available
        if (i < hex_data.size()) {
            record.hex_data = hex_data[i];
        }
        
        buffer_.push_back(record);
        coordinates_added++;
        total_coordinates_loaded_++;
    }

    return coordinates_added;
}

bool Buffer::getNextCoordinate(Coordinate& coordinate, std::string* hex_data) {
    std::lock_guard<std::mutex> lock(mutex_);

    if (buffer_.empty()) {
        return false;
    }

    coordinate = buffer_.front().coordinate;
    
    if (hex_data != nullptr) {
        *hex_data = buffer_.front().hex_data;
    }
    
    buffer_.pop_front();

    return true;
}

size_t Buffer::getBufferSize() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return buffer_.size();
}

bool Buffer::isBufferEmpty() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return buffer_.empty();
}

void Buffer::clearBuffer() {
    std::lock_guard<std::mutex> lock(mutex_);
    buffer_.clear();
}

size_t Buffer::getTotalCoordinatesLoaded() const {
    return total_coordinates_loaded_;
}

size_t Buffer::writeToFile(const std::string& output_file) {
    std::ofstream outfile(output_file);
    if (!outfile.is_open()) {
        std::cerr << "error opening output file: " << output_file << std::endl;
        return 0;
    }

    size_t coordinates_written = 0;

    std::lock_guard<std::mutex> lock(mutex_);

    for (const auto& record : buffer_) {
        outfile << record.coordinate.x << "," << record.coordinate.y << "\n";
        coordinates_written++;
    }

    return coordinates_written;
}

} // namespace arianna
