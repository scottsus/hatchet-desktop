# 🔥 Hatchet

## Quick start

### How to run MOCK Demo with Data streamer

Have 3 windows open, run the programs in this order

1. .\AriannaServer.exe TcpIp -Port 8000
2. py DataStreamer.py
3. yarn tauri dev

DataStreamer located in scripts folder (NOT the google drive one that fabrizio gave, I made my own)

AriannaServer get here [Google Drive Link](https://drive.google.com/drive/folders/1nL_LC-a1zWB0PO7IXJNdl2KyAP54Jtga?usp=sharing)

## Running the Arianna Server

1. Build and run docker container

```bash
cd src-arianna
docker-compose up -d
docker-compose exec arianna bash -c 'make run'
```

2. Run the test client

```bash
cd src-arianna
python test/tcp_client.py
```

3. Should get output similar to

```
🔥 Hatchet Server
Server started on port 8080
CTRL+C to stop the server
data: -47.615,-122.177,#thesia_string
```
