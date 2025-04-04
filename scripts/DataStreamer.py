import asyncio
import os
import time
import argparse

class DataStreamerPipe:
    b_stop = False
    messages_list = []
    tracks_list = []
    
    # Server connection details
    SERVER_IP = "127.0.0.1"
    SERVER_PORT = 8000
    
    @staticmethod
    def read_data():
        """
        Read the data from the file and return the operator number.
        """
        file1 = "RawData_20240408_090001_000001_000001_001.decod.74h"
        
        if os.path.exists(file1):
            print(file1)
        else:
            file1 = os.path.join(".", os.path.basename(file1))
            if os.path.exists(file1):
                print(file1)
            else:
                print(f"Error. File [{file1}] doesn't exist")
                DataStreamerPipe.b_stop = True
                return -1
        
        with open(file1, 'r') as sr:
            table = sr.read()
            data = table.split('\n')
            DataStreamerPipe.messages_list = [p for p in data if len(p) > 0 and p[0] == '#']
        
        op = -1
        first = DataStreamerPipe.messages_list[0][1:3] if DataStreamerPipe.messages_list else None
        if first is not None:
            op = int(first, 16)
        
        return op
    
    @staticmethod
    async def start_async():
        """
        Start the communication with the server using a single persistent connection.
        """
        op = DataStreamerPipe.read_data()
        if op < 0:
            return
        
        try:
            # Establish a single connection to use throughout the session
            print(f"Connecting to {DataStreamerPipe.SERVER_IP}:{DataStreamerPipe.SERVER_PORT}...")
            reader, writer = await asyncio.open_connection(
                DataStreamerPipe.SERVER_IP, DataStreamerPipe.SERVER_PORT)
            print("Connected successfully")
            
            try:
                # Initialize the operator
                command = f"Init {op}\n"
                print(f"Sending command: {command.strip()}")
                writer.write(command.encode())
                await writer.drain()
                
                # Wait a moment for the server to process
                await asyncio.sleep(0.2)
                
                # Set parameters
                x0 = 2.5
                y0 = -3.7
                rot = 0.034906585039886591
                w1 = 0.10
                w2 = 0
                sel = 4
                lat = 41.87892716196967
                lon = 12.508081927663124
                
                params_command = f"SetParameters {op},{x0},{y0},{rot},{w1},{w2},{sel},{lat},{lon}\n"
                print(f"Sending command: {params_command.strip()}")
                writer.write(params_command.encode())
                await writer.drain()

                # Wait for and read the acknowledgment response
                try:
                    response = await asyncio.wait_for(reader.read(1024), timeout=2.0)
                    ack_message = response.decode().strip()
                    print(f"Received acknowledgment: {ack_message}")
                    if not ack_message.lower().startswith(f"ok ({op})".lower()):
                        print(f"Warning: Expected 'Ok ({op})' but received '{ack_message}'")
                except asyncio.TimeoutError:
                    print("Timeout waiting for Init acknowledgment")
                
                # Wait a moment for the server to process
                await asyncio.sleep(0.2)
                
                # Send all messages
                i = 0
                for msg in DataStreamerPipe.messages_list:
                    message = f"Message {i} from Client"
                    print(f"Client send: {message}")
                    
                    set_command = f"Set {msg.rstrip()}\n"
                    print(f"Sending command: {set_command.strip()}")
                    writer.write(set_command.encode())
                    await writer.drain()
                    
                    # Standard delay between messages
                    await asyncio.sleep(1)  # Using 1 second as per original comment

                    # # Run last command
                    # last_command = f"Last {op}\n"
                    # print(f"Sending command: {last_command.strip()}")
                    # writer.write(last_command.encode())
                    # await writer.drain()

                    # # Read response with timeout
                    # try:
                    #     response = await asyncio.wait_for(reader.read(1024), timeout=2.0)
                    #     track_data = response.decode()
                    #     print(f"Received track data: {track_data.strip()}")
                    #     if track_data:
                    #         DataStreamerPipe.tracks_list.append(track_data)
                    # except asyncio.TimeoutError:
                    #     print("Timeout waiting for track data")
                
                    i += 1
                    # Check if track data should be retrieved
                    retrieve_track_data = getattr(DataStreamerPipe, 'retrieve_track_enabled', False)
                    
                    # You can control this by setting DataStreamerPipe.retrieve_track_enabled = True
                    # before calling start_async()
                    
                    if i % 10 == 0 and retrieve_track_data:
                        DataStreamerPipe.tracks_list.clear()
                        
                        # Send Get command
                        get_command = f"Get {op}\n"
                        print(f"Sending command: {get_command.strip()}")
                        writer.write(get_command.encode())
                        await writer.drain()
                        
                        # Read response with timeout
                        try:
                            full_response = ""
                            end_marker = f"End ({op})"
                            
                            # Continue reading until we get the End message
                            while True:
                                response = await asyncio.wait_for(reader.read(4096), timeout=2.0)
                                chunk = response.decode()
                                full_response += chunk
                                
                                if end_marker in full_response:
                                    break
                                    
                            print(f"Received complete track data: {len(full_response)} bytes")
                            
                            # Split the response by newlines
                            data_lines = full_response.strip().split('\n')
                            
                            # Process all lines except the "End (op)" message
                            for line in data_lines:
                                if line and not line.startswith(end_marker):
                                    print(f"Track coordinate: {line}")
                                    DataStreamerPipe.tracks_list.append(line)
                                elif line.startswith(end_marker):
                                    print(f"End of track data: {line}")
                        except asyncio.TimeoutError:
                            print("Timeout waiting for track data")
                
                # Stop the communication
                stop_command = f"Stop {op}\n"
                print(f"Sending command: {stop_command.strip()}")
                writer.write(stop_command.encode())
                await writer.drain()
                
                # Save the track in a file
                if DataStreamerPipe.tracks_list:
                    with open("Track.txt", 'w') as file:
                        file.write('\n'.join(DataStreamerPipe.tracks_list))
                    print(f"Track data saved to Track.txt")
                else:
                    print("No track data to save")
                    
                print("Client: communication ended.")
                    
            finally:
                # Ensure connection is properly closed
                print("Closing connection...")
                writer.close()
                await writer.wait_closed()
                print("Connection closed")
                
        except Exception as ex:
            print(f"Error during communication: {str(ex)}")


# Add a main section to execute the code
if __name__ == "__main__":
    
    parser = argparse.ArgumentParser(description="Data Streamer Client")
    parser.add_argument("--track", "-t", action="store_true", 
                        help="Enable track data retrieval")
    args = parser.parse_args()
    
    DataStreamerPipe.retrieve_track_enabled = args.track
    print(f"Track data retrieval: {'Enabled' if args.track else 'Disabled'}")
    
    asyncio.run(DataStreamerPipe.start_async())