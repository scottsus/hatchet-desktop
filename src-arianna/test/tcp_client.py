#!/usr/bin/env python3

import socket
import sys
import time

SERVER_IP = "127.0.0.1"
SERVER_PORT = 8080
BUFFER_SIZE = 1024


def connect_to_server():
    """Create and connect to the server"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((SERVER_IP, SERVER_PORT))
        return sock
    except Exception as e:
        print(f"Error connecting to server: {e}")
        return None


def send_init_command(sock, user_id):
    """Send Init command with user ID"""
    try:
        command = f"Init {user_id}\n"
        sock.send(command.encode("utf-8"))
        print(f"Sent command: {command.strip()}")
        return True
    except Exception as e:
        print(f"Error sending command: {e}")
        return False


def receive_response(sock):
    """Receive response from server"""
    try:
        response = sock.recv(BUFFER_SIZE)
        if response:
            print(f"Received response: {response.decode('utf-8').strip()}")
            return response.decode("utf-8")
        else:
            print("No response received")
            return None
    except Exception as e:
        print(f"Error receiving response: {e}")
        return None


def main():
    print("🔥 Hatchet TCP Client")
    print("Connecting to Arianna server...")

    # Connect to server
    sock = connect_to_server()
    if not sock:
        print("Failed to connect to server")
        return 1

    print(f"Connected to {SERVER_IP}:{SERVER_PORT}")

    try:
        if send_init_command(sock, 6969):
            time.sleep(0.1)
            receive_response(sock)

        print("Waiting for additional responses...")
        time.sleep(2)

        try:
            sock.settimeout(5.0)
            while True:
                response = receive_response(sock)
                if not response:
                    break
        except socket.timeout:
            print("No more data received")

    except KeyboardInterrupt:
        print("\nClient interrupted by user")
    finally:
        sock.close()
        print("Connection closed")

    return 0


if __name__ == "__main__":
    sys.exit(main())
