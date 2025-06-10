#include <iostream>
#include <cstring>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <chrono>
#include <thread>

// Server connection settings
const std::string SERVER_IP = "127.0.0.1";
const int SERVER_PORT = 8080;
const int BUFFER_SIZE = 1024;
const int RETRY_DELAY_MS = 500;

int connectToServer() {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        std::cerr << "Error creating socket: " << strerror(errno) << std::endl;
        return -1;
    }
    
    struct sockaddr_in serv_addr;
    serv_addr.sin_family = AF_INET;
    serv_addr.sin_port = htons(SERVER_PORT);
    
    if (inet_pton(AF_INET, SERVER_IP.c_str(), &serv_addr.sin_addr) <= 0) {
        std::cerr << "Invalid address: " << strerror(errno) << std::endl;
        close(sock);
        return -1;
    }
    
    if (connect(sock, (struct sockaddr*)&serv_addr, sizeof(serv_addr)) < 0) {
        std::cerr << "Connection failed: " << strerror(errno) << std::endl;
        close(sock);
        return -1;
    }
    
    return sock;
}

bool isEmptyData(const char* buffer, int length) {
    for (int i = 0; i < length; i++) {
        if (buffer[i] != '\n' && buffer[i] != '\r' && 
            buffer[i] != ' ' && buffer[i] != '\t' && buffer[i] != 0) {
            return false;
        }
    }
    return true;
}

int main() {
    std::cout << "Hatchet test client" << std::endl;
    
    int count = 0;
    while (true) {
        int sock = connectToServer();
        if (sock < 0) {
            return 1;
        }
        
        char buffer[BUFFER_SIZE] = {0};
        int valread = read(sock, buffer, BUFFER_SIZE);
        
        close(sock);
        
        if (valread <= 0) {
            std::cout << "No more data available from server" << std::endl;
            break;
        }
        
        if (isEmptyData(buffer, valread)) {
            std::cout << "Received empty data from server" << std::endl;
            break;
        }
        
        count++;
        std::cout << "i: " << count << " - data: " << buffer;
        
        // Wait before next connection
        std::this_thread::sleep_for(std::chrono::milliseconds(RETRY_DELAY_MS));
    }
    
    std::cout << "Test complete - made " << count << " successful connections" << std::endl;
    return 0;
}
