import asyncio
import os
import time
import argparse
import csv

class DataStreamerPipe:
    b_stop = False
    messages_list = []
    tracks_list = []
    
    # Server connection details
    SERVER_IP = "127.0.0.1"
    SERVER_PORT = 80
    
    @staticmethod
    def read_data(file_path=None):
        """
        Read the data from the file and return the operator number.
        The function can now handle both .decod.74h files and .csv files.
        """
        # Default file if none provided
        if file_path is None:
            # file_path = "RawData_20240408_090001_000001_000001_001.decod.74h"
            # file_path = "Phone_Data_Log_89.74h"
            file_path = "C:\Personal_Projects\hatchet-desktop\public\level.csv"
        
        # Check if file exists
        if os.path.exists(file_path):
            print(f"Reading file: {file_path}")
        else:
            file_path = os.path.join(".", os.path.basename(file_path))
            if os.path.exists(file_path):
                print(f"Reading file: {file_path}")
            else:
                print(f"Error. File [{file_path}] doesn't exist")
                DataStreamerPipe.b_stop = True
                return -1
        
        # Clear any existing data
        DataStreamerPipe.messages_list = []
        
        # Check file type and process accordingly
        if file_path.endswith('.csv'):
            return DataStreamerPipe._process_csv_file(file_path)
        else:
            return DataStreamerPipe._process_decod_file(file_path)
    
    @staticmethod
    def _process_decod_file(file_path):
        """Process .decod.74h files"""
        with open(file_path, 'r') as sr:
            table = sr.read()
            data = table.split('\n')
            DataStreamerPipe.messages_list = [p for p in data if len(p) > 0 and p[0] == '#']
        
        op = -1
        first = DataStreamerPipe.messages_list[0][1:3] if DataStreamerPipe.messages_list else None
        if first is not None:
            op = int(first, 16)

        # Demo File init coords
        lat = 41.87892716196967
        lon = 12.508081927663124
        
        return op, lat, lon
    
    @staticmethod
    def _process_csv_file(file_path):
        """Process CSV files by extracting the thesia_string column"""
        try:
            with open(file_path, 'r') as csv_file:
                csv_reader = csv.DictReader(csv_file)
                # Check if thesia_string column exists
                if 'thesia_string' not in csv_reader.fieldnames:
                    print(f"Error: 'thesia_string' column not found in {file_path}")
                    DataStreamerPipe.b_stop = True
                    return -1
                
                # Extract thesia_string values and coordinates
                first_row_processed = False
                for row in csv_reader:
                    thesia_string = row.get('thesia_string', '').strip()
                    if int(thesia_string, 16):
                        # Add "#" prefix to each string
                        DataStreamerPipe.messages_list.append(f"#{thesia_string}")
                        
                        # Extract Latitude and Longitude from the first message
                        if not first_row_processed:
                            try:
                                print(thesia_string)
                                # Check if latitude/longitude columns exist in CSV
                                latitude = row.get('Latitude')
                                longitude = row.get('Longitude')
                                op = thesia_string[0:2]
                                # Convert string hex to int dec
                                op = int(op, 16)
                                print(f"First row info: Latitude={latitude}, Longitude={longitude}, Operator={op}")
                                first_row_processed = True
                            except Exception as e:
                                print(f"Error extracting coordinates: {e}")
            
            return op, latitude, longitude
        except Exception as e:
            print(f"Error processing CSV file: {e}")
            DataStreamerPipe.b_stop = True
            return -1
    
    @staticmethod
    async def start_async(file_path=None):
        """
        Start the communication with the server using a single persistent connection.
        Now accepts an optional file path parameter.
        """
        op, lat, lon = DataStreamerPipe.read_data(file_path)
        print(f"Operator ID: {op}, Latitude: {lat}, Longitude: {lon}")
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
                x0 = 0
                y0 = 0
                rot = 0.0
                w1 = 0
                w2 = 0
                sel = 4
                lat = lat
                lon = lon
                
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
    parser.add_argument("--file", "-f", type=str, default=None,
                        help="Specify input file path (.decod.74h or .csv)")
    args = parser.parse_args()
    
    DataStreamerPipe.retrieve_track_enabled = args.track
    print(f"Track data retrieval: {'Enabled' if args.track else 'Disabled'}")
    
    asyncio.run(DataStreamerPipe.start_async(args.file))