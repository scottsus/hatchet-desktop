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
    
    g_processor.reset();
    
    exit(signum);
}

int main() {
    signal(SIGINT, signalHandler);
    
    // ⚙️ settings
    int port = 5051;

    std::cout << "🔥 Hatchet Server (with libarianna.so)" << std::endl;

    try {
        // Create the AriannaProcessor with RAII for dynamic processing
        g_processor = std::make_unique<arianna::AriannaProcessor>();
        
        // Create an empty buffer - data will be added dynamically via TCP commands
        arianna::Buffer buffer;
        g_buffer = &buffer;

        Server server(buffer, port);
        g_server = &server;
        if (!server.start()) {
            std::cerr << "Failed to start server" << std::endl;
            return 1;
        }

        std::cout << "Server listening on port " << port << std::endl;
        std::cout << "Ready to receive TCP commands (Init, Set, Get, Last, etc.)" << std::endl;
        std::cout << "CTRL+C to stop the server" << std::endl;

        while (server.isRunning()) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }

        g_processor.reset();

        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}
