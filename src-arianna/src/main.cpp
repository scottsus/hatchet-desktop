#include "arianna/data_loader.h"
#include "arianna/processor.h"
#include "arianna/buffer.h"
#include "server/server.h"
#include <iostream>
#include <string>
#include <iomanip>
#include <csignal>
#include <memory>

arianna::Buffer* g_buffer = nullptr;
Server* g_server = nullptr;
std::unique_ptr<arianna::AriannaProcessor> g_processor = nullptr;

void signalHandler(int signum) {
    if (g_server != nullptr) {
        g_server->stop();
    }
    
    // AriannaProcessor will be cleaned up automatically when g_processor is destroyed
    g_processor.reset();
    
    exit(signum);
}

int main() {
    signal(SIGINT, signalHandler);
    
    // ⚙️ settings
    std::string csv_file = "./data/03-13/level.csv";
    std::string output_file = "./data/03-13/arianna_coordinates.txt";
    int port = 8080;

    std::cout << "🔥 Hatchet Server" << std::endl;

    arianna::DataLoader loader(csv_file);
    std::vector<std::string> hex_data = loader.loadData();

    try {
        // Create the AriannaProcessor with RAII
        g_processor = std::make_unique<arianna::AriannaProcessor>();
        
        // Process the data
        arianna::ProcessorResult result = g_processor->process(hex_data);
        if (result.status != 0) {
            std::cerr << "error processing csv data: " << result.error_message << std::endl;
            return 1;
        }

        arianna::Buffer buffer;
        g_buffer = &buffer;
        size_t coordinates_added = buffer.addCoordinates(result.coordinates, hex_data);
        size_t _ = buffer.writeToFile(output_file);

        Server server(buffer, port);
        g_server = &server;
        if (!server.start()) {
            std::cerr << "Failed to start server" << std::endl;
            return 1;
        }

        std::cout << "CTRL+C to stop the server" << std::endl;

        while (server.isRunning()) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }

        // AriannaProcessor will be cleaned up automatically when g_processor is destroyed
        g_processor.reset();

        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}
