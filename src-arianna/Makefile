CC := g++
CFLAGS := -w -fPIC -pthread
LDFLAGS := -ldl -pthread

SRC_DIR := src
DIST_DIR := build
DATA_DIR := data

PROCESSOR_SRC := $(SRC_DIR)/arianna/processor.cpp
PROCESSOR_HDR := $(SRC_DIR)/arianna/processor.h
PROCESSOR_OBJ := $(DIST_DIR)/processor.o

DATA_LOADER_SRC := $(SRC_DIR)/arianna/data_loader.cpp
DATA_LOADER_HDR := $(SRC_DIR)/arianna/data_loader.h
DATA_LOADER_OBJ := $(DIST_DIR)/data_loader.o

BUFFER_SRC := $(SRC_DIR)/arianna/buffer.cpp
BUFFER_HDR := $(SRC_DIR)/arianna/buffer.h
BUFFER_OBJ := $(DIST_DIR)/buffer.o

SERVER_SRC := $(SRC_DIR)/server/server.cpp
SERVER_HDR := $(SRC_DIR)/server/server.h
SERVER_OBJ := $(DIST_DIR)/server.o

TEST_CLIENT_SRC := $(SRC_DIR)/server/test_client.cpp
TEST_CLIENT_TARGET := $(DIST_DIR)/test_client

MAIN_SRC := $(SRC_DIR)/main.cpp
MAIN_TARGET := $(DIST_DIR)/main

.PHONY: all clean run test_client


# build libraries

all: $(MAIN_TARGET) $(TEST_CLIENT_TARGET)

$(PROCESSOR_OBJ): $(PROCESSOR_SRC) $(PROCESSOR_HDR) | $(DIST_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(DATA_LOADER_OBJ): $(DATA_LOADER_SRC) $(DATA_LOADER_HDR) | $(DIST_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUFFER_OBJ): $(BUFFER_SRC) $(BUFFER_HDR) | $(DIST_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(SERVER_OBJ): $(SERVER_SRC) $(SERVER_HDR) | $(DIST_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(MAIN_TARGET): $(MAIN_SRC) $(PROCESSOR_OBJ) $(DATA_LOADER_OBJ) $(BUFFER_OBJ) $(SERVER_OBJ) | $(DIST_DIR)
	$(CC) $(CFLAGS) $< $(PROCESSOR_OBJ) $(DATA_LOADER_OBJ) $(BUFFER_OBJ) $(SERVER_OBJ) -o $@ $(LDFLAGS)

$(TEST_CLIENT_TARGET): $(TEST_CLIENT_SRC) | $(DIST_DIR)
	$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS)

$(DIST_DIR):
	mkdir -p $(DIST_DIR)

run: $(MAIN_TARGET)
	LD_LIBRARY_PATH=./$(DIST_DIR) ./$<

test_client: $(TEST_CLIENT_TARGET)
	./$<

clean:
	rm -f $(PROCESSOR_OBJ) $(DATA_LOADER_OBJ) $(BUFFER_OBJ) $(SERVER_OBJ) $(MAIN_TARGET) $(TEST_CLIENT_TARGET) $(DATA_DIR)/custom/output_in_coords.txt $(DATA_DIR)/custom/processed_coordinates.txt
