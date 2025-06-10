#include "data_loader.h"
#include <fstream>
#include <iostream>
#include <sstream>

namespace arianna {

DataLoader::DataLoader(const std::string& csv_file)
    : csv_file_(csv_file) {
}

DataLoader::~DataLoader() {
}

std::vector<std::string> DataLoader::loadData() {
    std::vector<std::string> hex_data;

    std::ifstream infile(csv_file_);
    if (!infile.is_open()) {
        std::cerr << "error opening CSV file: " << csv_file_ << std::endl;
        return hex_data;
    }

    std::string line;
    while (getline(infile, line)) {
        if (!line.empty()) {
            // `thesia_string` is in last column of csv data
            size_t pos = line.find_last_of(',');
            std::string hex = (pos != std::string::npos) ? line.substr(pos + 1) : line;
            
            if (!hex.empty() && hex[0] != '#') {
                hex = "#" + hex;
            }
            
            hex_data.push_back(hex);
        }
    }
    infile.close();

    return hex_data;
}

std::string DataLoader::getFilePath() const {
    return csv_file_;
}

} // namespace arianna
