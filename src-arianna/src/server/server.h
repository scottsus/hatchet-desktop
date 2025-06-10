#ifndef SERVER_H
#define SERVER_H

#include "../arianna/buffer.h"
#include <string>
#include <atomic>
#include <thread>

/**
 * TCP Server class for serving coordinates from a buffer
 */
class Server {
public:
    /**
     * Constructor
     *
     * @param buffer Reference to a Buffer object
     * @param port Port number to listen on
     */
    Server(arianna::Buffer& buffer, int port = 8080);
    
    /**
     * Destructor
     */
    ~Server();
    
    /**
     * Start the server
     *
     * @return true if the server was started successfully, false otherwise
     */
    bool start();
    
    /**
     * Stop the server
     */
    void stop();
    
    /**
     * Check if the server is running
     *
     * @return true if the server is running, false otherwise
     */
    bool isRunning() const;

private:
    arianna::Buffer& buffer_;
    int port_;
    int server_fd_;
    std::atomic<bool> running_;
    std::thread server_thread_;
    
    /**
     * Server thread function
     */
    void serverThread();
    
    /**
     * Handle a client connection
     *
     * @param client_fd Client socket file descriptor
     */
    void handleClient(int client_fd);
};

#endif // SERVER_H
