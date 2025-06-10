#ifndef ARIANNA_DATA_LOADER_H
#define ARIANNA_DATA_LOADER_H

#include <string>
#include <vector>

namespace arianna {

/**
 * Data loader class for loading and parsing CSV files
 */
class DataLoader {
public:
    /**
     * Constructor
     *
     * @param csv_file Path to the CSV file
     */
    DataLoader(const std::string& csv_file);
    
    /**
     * Destructor
     */
    ~DataLoader();
    
    /**
     * Load data from the CSV file
     *
     * @return Vector of hex data strings (each starting with #)
     */
    std::vector<std::string> loadData();
    
    /**
     * Get the path to the CSV file
     *
     * @return Path to the CSV file
     */
    std::string getFilePath() const;

private:
    std::string csv_file_;
};

} // namespace arianna

#endif // ARIANNA_DATA_LOADER_H
