#include "server.h"
#include "../arianna/processor.h"
#include <iostream>
#include <sstream>
#include <memory>
#include <cstring>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <sstream>
#include <errno.h>

Server::Server(arianna::Buffer& buffer, int port)
    : buffer_(buffer), port_(port), server_fd_(-1), running_(false) {
}

Server::~Server() {
    stop();
}

bool Server::start() {
    if (running_) {
        std::cerr << "server is already running" << std::endl;
        return false;
    }
    
    server_fd_ = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd_ < 0) {
        std::cerr << "error creating socket: " << strerror(errno) << std::endl;
        return false;
    }
    
    int opt = 1;
    if (setsockopt(server_fd_, SOL_SOCKET, SO_REUSEADDR | SO_REUSEPORT, &opt, sizeof(opt)) < 0) {
        std::cerr << "error setting socket options: " << strerror(errno) << std::endl;
        close(server_fd_);
        server_fd_ = -1;
        return false;
    }
    
    struct sockaddr_in address;
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(port_);
    
    if (bind(server_fd_, (struct sockaddr*)&address, sizeof(address)) < 0) {
        std::cerr << "error binding socket: " << strerror(errno) << std::endl;
        close(server_fd_);
        server_fd_ = -1;
        return false;
    }
    
    if (listen(server_fd_, 3) < 0) {
        std::cerr << "error listening on socket: " << strerror(errno) << std::endl;
        close(server_fd_);
        server_fd_ = -1;
        return false;
    }
    

    running_ = true;
    server_thread_ = std::thread(&Server::serverThread, this);
    
    std::cout << "Server started on port " << port_ << std::endl;
    return true;
}

void Server::stop() {
    if (!running_) {
        return;
    }
    
    running_ = false;
    
    if (server_fd_ >= 0) {
        close(server_fd_);
        server_fd_ = -1;
    }
    
    if (server_thread_.joinable()) {
        server_thread_.join();
    }
}

bool Server::isRunning() const {
    return running_;
}

void Server::serverThread() {
    struct sockaddr_in address;
    int addrlen = sizeof(address);
    
    while (running_) {
        // Accept connection
        int client_fd = accept(server_fd_, (struct sockaddr*)&address, (socklen_t*)&addrlen);
        if (client_fd < 0) {
            if (running_) {
                std::cerr << "error accepting connection: " << strerror(errno) << std::endl;
            }
            continue;
        }
        
        // Handle client
        handleClient(client_fd);
        
        // Close client socket
        close(client_fd);
    }
}

void Server::handleClient(int client_fd) {
    struct sockaddr_in client_addr;
    socklen_t client_addr_len = sizeof(client_addr);
    getpeername(client_fd, (struct sockaddr*)&client_addr, &client_addr_len);
    std::string client_ip = inet_ntoa(client_addr.sin_addr);
    
    char buffer[1024];
    
    // Set receive timeout to prevent hanging
    struct timeval timeout;
    timeout.tv_sec = 30;  // 30 second timeout (generous for real commands)
    timeout.tv_usec = 0;
    if (setsockopt(client_fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout)) < 0) {
        std::cout << "Failed to set socket timeout: " << strerror(errno) << std::endl;
    }
    
    // Read command from client
    int bytes_read = recv(client_fd, buffer, sizeof(buffer) - 1, 0);
    
    if (bytes_read <= 0) {
        return;
    }
    
    buffer[bytes_read] = '\0';
    std::string command(buffer);
    command.erase(command.find_last_not_of(" \n\r\t") + 1); // trim whitespace
    
    std::string response = processCommand(command);
    
    // Send response back to client
    response += "\n";
    send(client_fd, response.c_str(), response.length(), 0);
}

std::string Server::processCommand(const std::string& command) {
    std::istringstream iss(command);
    std::string cmd_type;
    iss >> cmd_type;
    
    if (cmd_type == "Init") {
        int user_id;
        iss >> user_id;
        std::cout << "Init " << user_id << std::endl;
        return "OK Init " + std::to_string(user_id);
        
    } else if (cmd_type == "Set") {
        std::string hex_data;
        iss >> hex_data;
        std::cout << "Set " << hex_data << std::endl;
        
        // Process hex data using AriannaProcessor
        std::vector<std::string> hex_vector = {hex_data};
        arianna::ProcessorConfig config;
        
        // Use global processor if available
        extern std::unique_ptr<arianna::AriannaProcessor> g_processor;
        if (g_processor) {
            arianna::ProcessorResult result = g_processor->process(hex_vector, config);
            if (result.status == 0 && !result.coordinates.empty()) {
                // Add coordinates to buffer for later retrieval
                buffer_.addCoordinates(result.coordinates, hex_vector);
                return "OK Set processed " + std::to_string(result.coordinates.size()) + " coordinates";
            } else {
                return "ERROR Set processing failed: " + result.error_message;
            }
        }
        return "ERROR Set processor not available";
        
    } else if (cmd_type == "Get") {
        int user_id;
        iss >> user_id;
        std::cout << "Processing Get command for user " << user_id << std::endl;
        
        // Return all coordinates for this user
        arianna::Coordinate coord;
        std::string hex_data;
        std::string response = "OK Get ";
        
        while (buffer_.getNextCoordinate(coord, &hex_data)) {
            response += std::to_string(coord.x) + "," + std::to_string(coord.y) + " ";
        }
        return response;
        
    } else if (cmd_type == "Last") {
        int user_id;
        iss >> user_id;
        std::cout << "Processing Last command for user " << user_id << std::endl;
        
        // Return last coordinate for this user
        arianna::Coordinate coord;
        std::string hex_data;
        
        if (buffer_.getNextCoordinate(coord, &hex_data)) {
            return "OK Last " + std::to_string(coord.x) + "," + std::to_string(coord.y);
        } else {
            return "ERROR Last no data available";
        }
        
    } else {
        std::cout << "Unknown command: " << cmd_type << std::endl;
        return "ERROR Unknown command: " + cmd_type;
    }
}
