import win32pipe
import win32file
import time
import csv
import subprocess
from typing import Optional
import signal
import sys
import asyncio
import os
import sys

class AriannaServer:
    def __init__(self):
        self.server_path = "public/AriannaServer.0x20250130.A/AriannaServer.exe"
        self.process: Optional[subprocess.Popen] = None
        # Setup signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

    def signal_handler(self, _signum, _frame):
        print("\nSignal received, cleaning up...")
        self.stop()
        sys.exit(0)
    def start(self):
        try:
            self.process = subprocess.Popen(
                self.server_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            time.sleep(2)  # Wait for server startup
            return True
        except Exception as e:
            print(f"Server start failed: {e}")
            return False

    def stop(self):
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)  # Wait up to 5 seconds
            except subprocess.TimeoutExpired:
                print("Force killing server process...")
                self.process.kill()  # Force kill if not responding
            finally:
                self.process = None


import datetime

class DataStreamerPipe:
    def __init__(self):
        self.server_path = "public/AriannaServer.0x20250130.A/AriannaServer.exe"
        self.messages = []
        self.msg_count = 0
        self.received_count = 0
        self.stop = asyncio.Event()
        
    def log(self, message):
        timestamp = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] {message}")

    async def connect_pipes(self):
        try:
            self.log("Connecting to pipes...")
            self.output_pipe = open(r'\\.\pipe\AriannaSrv.Pipe.In', 'w')
            self.input_pipe = open(r'\\.\pipe\AriannaSrv.Pipe.Out', 'r')
            self.log("✓ Connected successfully")
            return True
        except Exception as e:
            self.log(f"✗ Failed to connect: {e}")
            return False

    async def read_pipe(self):
        try:
            while not self.stop.is_set():
                line = await asyncio.get_event_loop().run_in_executor(None, self.input_pipe.readline)

                if not line:
                    break
                if line.startswith("Stop"):
                    self.stop.set()
                    break
                self.received_count += 1
                self.log(f"← Received[{self.received_count}]: {line.strip()}")
        except Exception as e:
            self.log(f"✗ Error reading pipe: {e}")
            self.stop.set()

    async def send_commands(self, op):
        try:
            self.log(f"Starting command sequence for operator {op}")
            
            # Step 1: Initialize operator
            init_cmd = f"Init {op}\n"
            self.output_pipe.write(init_cmd)
            self.output_pipe.flush()
            self.log(f"→ Sent: {init_cmd.strip()}")
            await asyncio.sleep(0.1)

            # Step 2: Set parameters
            params = (f"SetParameters {op},2.5,-3.7,"
                     f"0.034906585039886591,0.1,0,4,"
                     f"41.87892716196967,12.508081927663124\n")
            self.output_pipe.write(params)
            self.output_pipe.flush()
            self.log(f"→ Sent: Parameters set")
            await asyncio.sleep(0.1)

            # Step 3: Send messages
            total = len(self.messages)
            for i, msg in enumerate(self.messages, 1):
                self.output_pipe.write(f"Set {msg.strip()}\n")
                self.output_pipe.flush()
                if i % 10 == 0:
                    self.log(f"→ Progress: {i}/{total} messages sent")
                await asyncio.sleep(0.1)

            self.log("✓ All messages sent")

            # Step 4: Get command
            self.output_pipe.write(f"Get {op}\n")
            self.output_pipe.flush()
            self.log("→ Sent: Get command")
            
            # Stop operator
            self.output_pipe.write(f"Stop {op}\n")
            self.output_pipe.flush()
            self.log("→ Sent: Stop command")

        except Exception as e:
            self.log(f"✗ Error in command sequence: {e}")
            self.stop = True

    async def start(self):
        self.log("=== Starting DataStreamer ===")
        if not await self.connect_pipes():
            return

        try:
            read_task = asyncio.create_task(self.read_pipe())
            await self.send_commands(1)
            await read_task
            self.log("=== DataStreamer finished ===")
        finally:
            if self.input_pipe:
                self.input_pipe.close()
            if self.output_pipe:
                self.output_pipe.close()

    def load_messages(self, filename):
        try:
            with open(filename, 'r') as csvfile:
                reader = csv.reader(csvfile)
                self.messages = []
                header = next(reader)  # Get header row
                thesia_idx = header.index('thesia_string')  # Find thesia_string column index
                for row in reader:
                    if len(row) > thesia_idx:  # Check if row has enough columns
                        self.messages.append(row[thesia_idx])
        except Exception as e:
            print(f"Error loading messages: {e}")
        print(f"Loaded {len(self.messages)} messages from {filename}")


if __name__ == "__main__":
    server = AriannaServer()
    server.start()
    
    streamer = DataStreamerPipe()
    streamer.load_messages("public\level.csv")
    asyncio.run(streamer.start())
    
    server.stop()