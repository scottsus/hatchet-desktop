#include "server.h"
#include <iostream>
#include <cstring>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <sstream>

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
    
    arianna::Coordinate coordinate;
    std::string hex_data;
    
    if (buffer_.getNextCoordinate(coordinate, &hex_data)) {
        // Format response
        std::stringstream response;
        response << coordinate.x << "," << coordinate.y << "," << hex_data << "\n";
        
        // Send response
        std::string response_str = response.str();
        send(client_fd, response_str.c_str(), response_str.length(), 0);
        
        std::cout << "data: " << response_str;
    } else {
        // Send an empty string when there's no more data
        std::string response = "";
        send(client_fd, response.c_str(), response.length(), 0);
        
        std::cout << "[NO MORE DATA]" << std::endl;
    }
}
