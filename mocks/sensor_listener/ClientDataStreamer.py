import argparse
import os
import socket
import time


def stream_log_file(log_file, host, port, delay=0.1):
    """
    Stream the contents of a log file to a TCP socket line by line.

    Args:
        log_file: Path to the log file
        host: Target host address
        port: Target port
        delay: Delay between lines in seconds
    """
    print(f"Streaming data from {log_file} to {host}:{port} with {delay}s delay")

    try:
        # Create a socket connection
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((host, port))
        print(f"Connected to {host}:{port}")

        try:
            with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    try:
                        # Send the line with a newline character
                        sock.sendall((line.strip() + "\n").encode("utf-8"))
                        print(f"Sent: {line.strip()}")

                        # Delay between sends
                        time.sleep(delay)
                    except socket.error as e:
                        print(f"Socket error while sending: {e}")
                        break
        except FileNotFoundError:
            print(f"File not found: {log_file}")
        except Exception as e:
            print(f"Error reading file: {e}")
    except ConnectionRefusedError:
        print(f"Connection refused to {host}:{port}")
    except socket.error as e:
        print(f"Socket error: {e}")
    finally:
        try:
            sock.close()
            print("Socket closed")
        except:
            pass


def main():
    parser = argparse.ArgumentParser(description="Stream a log file to a TCP socket")
    parser.add_argument(
        "--file", default="Ngrok_Data_Log_89.txt", help="Log file to stream"
    )
    parser.add_argument("--host", default="127.0.0.1", help="Target host")
    parser.add_argument("--port", type=int, default=5050, help="Target port")
    parser.add_argument(
        "--delay", type=float, default=0.1, help="Delay between lines in seconds"
    )

    args = parser.parse_args()

    # Resolve the file path
    script_dir = os.path.dirname(os.path.realpath(__file__))
    log_file = os.path.join(script_dir, args.file)

    stream_log_file(log_file, args.host, args.port, args.delay)


if __name__ == "__main__":
    main()
