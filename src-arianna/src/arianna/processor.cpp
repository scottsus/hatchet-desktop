#include "processor.h"
#include <stdio.h>
#include <stdlib.h>
#include <dlfcn.h>
#include <string.h>
#include <iostream>
#include <fstream>
#include <stdexcept>

namespace arianna {

typedef int (*GetVersionFunc)();
typedef int (*InitLibFunc)();
typedef int (*InitPathFunc)(int, int, int);
typedef int (*FreePathFunc)(int);
typedef int (*FreeAllPathFunc)();
typedef int (*GetStepFunc)(int);
typedef int (*GetMsgFunc)(int);
typedef int (*SetMessageFunc)(int, char*);
typedef float* (*GetPathFunc)(int, float, float, float, float, float, int);
typedef double* (*GetPathGPSFunc)(int, float, float, float, float, float, int, double, double);

// Global variables to store library handle and function pointers
static void* handle = nullptr;
static GetVersionFunc getAriannaPostprocVersion = nullptr;
static InitLibFunc initAriannaLib = nullptr;
static InitPathFunc initAriannaPath = nullptr;
static FreePathFunc freeAriannaPath = nullptr;
static FreeAllPathFunc freeAriannaAllPath = nullptr;
static GetStepFunc getAriannanStep = nullptr;
static GetMsgFunc getAriannanMsg = nullptr;
static SetMessageFunc setAriannaMessage = nullptr;
static GetPathFunc getAriannaPath = nullptr;
static GetPathGPSFunc getAriannaPath_GPS = nullptr;

int initialize() {
    if (handle != nullptr) {
        return 0;
    }

    handle = dlopen("./lib/libarianna.so", RTLD_LOCAL | RTLD_LAZY);
    if (!handle) {
        std::cerr << "Error loading libarianna.so: " << dlerror() << std::endl;
        return 1;
    }

    *(void **)(&getAriannaPostprocVersion) = dlsym(handle, "getAriannaPostprocVersion");
    *(void **)(&initAriannaLib) = dlsym(handle, "initAriannaLib");
    *(void **)(&initAriannaPath) = dlsym(handle, "initAriannaPath");
    *(void **)(&setAriannaMessage) = dlsym(handle, "setAriannaMessage");
    *(void **)(&freeAriannaPath) = dlsym(handle, "freeAriannaPath");
    *(void **)(&freeAriannaAllPath) = dlsym(handle, "freeAriannaAllPath");
    *(void **)(&getAriannanStep) = dlsym(handle, "getAriannanStep");
    *(void **)(&getAriannanMsg) = dlsym(handle, "getAriannanMsg");
    *(void **)(&getAriannaPath) = dlsym(handle, "getAriannaPath");
    *(void **)(&getAriannaPath_GPS) = dlsym(handle, "getAriannaPath_GPS");

    if (getAriannaPostprocVersion == nullptr) {
        std::cerr << "error: getAriannaPostprocVersion function not found" << std::endl;
        dlclose(handle);
        handle = nullptr;
        return 1;
    }

    int ret = initAriannaLib();
    if (ret != 0) {
        std::cerr << "error initializing Arianna library: " << ret << std::endl;
        dlclose(handle);
        handle = nullptr;
        return ret;
    }

    return 0;
}

ProcessorResult process(const std::vector<std::string>& hex_data, const ProcessorConfig& config) {
    ProcessorResult result;
    result.status = 0;
    result.version = 0;
    result.step_count = 0;
    result.message_count = 0;

    if (handle == nullptr) {
        result.status = 1;
        result.error_message = "arianna library not initialized.";
        return result;
    }

    int ret = initAriannaPath(config.operator_id, 0, 0);
    if (ret != 0) {
        result.status = 1;
        result.error_message = "error initializing arianna path: " + std::to_string(ret);
        return result;
    }

    result.version = getAriannaPostprocVersion();

    // Process each hex string
    for (const auto& hex : hex_data) {
        if (!hex.empty() && hex[0] == '#') {
            char messageHex[200];
            strncpy(messageHex, hex.c_str(), sizeof(messageHex) - 1);
            messageHex[sizeof(messageHex) - 1] = '\0';
            setAriannaMessage(config.operator_id, messageHex);
        }
    }

    result.step_count = getAriannanStep(config.operator_id);
    result.message_count = getAriannanMsg(config.operator_id);

    // gets the processed coordinates
    // can be either lat_long or meters
    double* vector;
    if (config.use_lat_long) {
        vector = getAriannaPath_GPS(
            config.operator_id,
            config.x0,
            config.y0,
            config.rotation,
            config.correction_t,
            config.correction_w,
            1,
            config.start_latitude,
            config.start_longitude
        );
    } else {
        vector = (double*)getAriannaPath(
            config.operator_id,
            config.x0,
            config.y0,
            config.rotation,
            config.correction_t,
            config.correction_w,
            1
        );
    }

    for (int i = 0; i < result.message_count; i++) {
        Coordinate coord;
        coord.x = -vector[i];
        coord.y = vector[result.message_count + i];
        result.coordinates.push_back(coord);
    }

    return result;
}

int cleanup(int operator_id) {
    if (handle == nullptr || freeAriannaPath == nullptr) {
        return 1;
    }

    return freeAriannaPath(operator_id);
}

int cleanup_all() {
    if (handle == nullptr || freeAriannaAllPath == nullptr) {
        return 1;
    }

    int result = freeAriannaAllPath();

    if (handle != nullptr) {
        dlclose(handle);
        handle = nullptr;
    }

    getAriannaPostprocVersion = nullptr;
    initAriannaLib = nullptr;
    initAriannaPath = nullptr;
    freeAriannaPath = nullptr;
    freeAriannaAllPath = nullptr;
    getAriannanStep = nullptr;
    getAriannanMsg = nullptr;
    setAriannaMessage = nullptr;
    getAriannaPath = nullptr;
    getAriannaPath_GPS = nullptr;

    return result;
}

// AriannaProcessor implementation
AriannaProcessor::AriannaProcessor() {
    int result = initialize();
    if (result != 0) {
        throw std::runtime_error("Failed to initialize Arianna processor");
    }
}

AriannaProcessor::~AriannaProcessor() {
    cleanup_all();
}

ProcessorResult AriannaProcessor::process(const std::vector<std::string>& hex_data, const ProcessorConfig& config) {
    return arianna::process(hex_data, config);
}

} // namespace arianna
