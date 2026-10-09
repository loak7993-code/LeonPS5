#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

#include <chrono>
#include <map>
#include <string>

// No touch input is emulated: recognizers exist but never report events.
namespace {

constexpr std::int32_t GESTURE_HANDLE = 1;
constexpr int SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT = static_cast<int>(0x80D10002);
constexpr int SCE_SYSTEM_GESTURE_ERROR_INVALID_HANDLE = static_cast<int>(0x80D10003);
constexpr int SCE_SYSTEM_GESTURE_ERROR_INDEX_OUT_OF_ARRAY = static_cast<int>(0x80D10005);

struct RecognizerState {
    std::int32_t gesture_type = 0;
    SystemGestureRectangle rectangle {};
    std::uint64_t updated_time = 0;
};

std::map<const SystemGestureTouchRecognizer*, RecognizerState> g_recognizers;

std::uint64_t Now() {
    return static_cast<std::uint64_t>(std::chrono::duration_cast<std::chrono::microseconds>(
        std::chrono::steady_clock::now().time_since_epoch()).count());
}

int CheckHandle(std::int32_t gesture_handle) {
    return gesture_handle == GESTURE_HANDLE ? 0 : SCE_SYSTEM_GESTURE_ERROR_INVALID_HANDLE;
}

RecognizerState& RequireRecognizer(const char* origin, const SystemGestureTouchRecognizer* recognizer) {
    if (recognizer == nullptr) throw std::invalid_argument(std::string(origin) + ": null recognizer");
    const auto found = g_recognizers.find(recognizer);
    if (found == g_recognizers.end()) throw std::runtime_error(std::string(origin) + ": recognizer is not registered");
    return found->second;
}

}

extern "C" {

int APS5_VABI sceSystemGestureAppendTouchRecognizer(std::int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (recognizer == nullptr) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    RecognizerState& state = g_recognizers[recognizer];
    state.updated_time = Now();
    return 0;
}

int APS5_VABI sceSystemGestureClose(std::int32_t gesture_handle) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    g_recognizers.clear();
    return 0;
}

int APS5_VABI sceSystemGestureCreateTouchRecognizer(std::int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer, std::int32_t type, const SystemGestureRectangle* rectangle, const void* param) {
    (void)param;
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (recognizer == nullptr || rectangle == nullptr) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    RecognizerState& state = g_recognizers[recognizer];
    state.gesture_type = type;
    state.rectangle = *rectangle;
    state.updated_time = Now();
    return 0;
}

int APS5_VABI sceSystemGestureFinalizePrimitiveTouchRecognizer(void) {
    return 0;
}

int APS5_VABI sceSystemGestureGetPrimitiveTouchEventByIndex(std::int32_t gesture_handle, std::uint32_t index, SystemGesturePrimitiveTouchEvent* event) {
    (void)index;
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (event == nullptr) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    return SCE_SYSTEM_GESTURE_ERROR_INDEX_OUT_OF_ARRAY;
}

int APS5_VABI sceSystemGestureGetPrimitiveTouchEventByPrimitiveID(std::int32_t gesture_handle, std::uint16_t primitiveId, SystemGesturePrimitiveTouchEvent* event) {
    (void)primitiveId;
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (event == nullptr) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
}

int APS5_VABI sceSystemGestureGetPrimitiveTouchEvents(std::int32_t gesture_handle, SystemGesturePrimitiveTouchEvent* event_buffer, std::uint32_t capacity_of_buffer, std::uint32_t* number_of_event) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (number_of_event == nullptr || (event_buffer == nullptr && capacity_of_buffer > 0)) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    *number_of_event = 0;
    return 0;
}

int APS5_VABI sceSystemGestureGetPrimitiveTouchEventsCount(std::int32_t gesture_handle) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    return 0;
}

int APS5_VABI sceSystemGestureGetTouchEventByEventID(std::int32_t gesture_handle, const SystemGestureTouchRecognizer* recognizer, std::uint32_t eventId, SystemGestureTouchEvent* event) {
    (void)eventId;
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (event == nullptr) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    RequireRecognizer(__func__, recognizer);
    return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
}

int APS5_VABI sceSystemGestureGetTouchEventByIndex(std::int32_t gesture_handle, const SystemGestureTouchRecognizer* recognizer, std::uint32_t index, SystemGestureTouchEvent* event) {
    (void)index;
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (event == nullptr) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    RequireRecognizer(__func__, recognizer);
    return SCE_SYSTEM_GESTURE_ERROR_INDEX_OUT_OF_ARRAY;
}

int APS5_VABI sceSystemGestureGetTouchEvents(std::int32_t gesture_handle, const SystemGestureTouchRecognizer* recognizer, SystemGestureTouchEvent* event_buffer, std::uint32_t capacity_of_buffer, std::uint32_t* number_of_event) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (number_of_event == nullptr || (event_buffer == nullptr && capacity_of_buffer > 0)) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    RequireRecognizer(__func__, recognizer);
    *number_of_event = 0;
    return 0;
}

int APS5_VABI sceSystemGestureGetTouchEventsCount(std::int32_t gesture_handle, const SystemGestureTouchRecognizer* recognizer) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    RequireRecognizer(__func__, recognizer);
    return 0;
}

int APS5_VABI sceSystemGestureGetTouchRecognizerInformation(std::int32_t gesture_handle, const SystemGestureTouchRecognizer* recognizer, SystemGestureTouchRecognizerInformation* information) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (information == nullptr) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    const RecognizerState& state = RequireRecognizer(__func__, recognizer);
    *information = SystemGestureTouchRecognizerInformation {};
    information->gesture_type = state.gesture_type;
    information->rectangle = state.rectangle;
    information->updated_time = state.updated_time;
    return 0;
}

int APS5_VABI sceSystemGestureInitializePrimitiveTouchRecognizer(const void* param) {
    (void)param;
    return 0;
}

int32_t APS5_VABI sceSystemGestureOpen(int32_t input_type, const void* param) {
    (void)input_type;
    (void)param;
    return GESTURE_HANDLE;
}

int APS5_VABI sceSystemGestureRemoveTouchRecognizer(std::int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (recognizer == nullptr) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    RequireRecognizer(__func__, recognizer);
    g_recognizers.erase(recognizer);
    return 0;
}

int APS5_VABI sceSystemGestureResetPrimitiveTouchRecognizer(std::int32_t gesture_handle) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    return 0;
}

int APS5_VABI sceSystemGestureResetTouchRecognizer(std::int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (recognizer == nullptr) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    RequireRecognizer(__func__, recognizer);
    return 0;
}

int APS5_VABI sceSystemGestureUpdateAllTouchRecognizer(std::int32_t gesture_handle) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    return 0;
}

int APS5_VABI sceSystemGestureUpdatePrimitiveTouchRecognizer(std::int32_t gesture_handle, const void* param) {
    (void)param;
    return CheckHandle(gesture_handle);
}

int APS5_VABI sceSystemGestureUpdateTouchRecognizer(std::int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (recognizer == nullptr) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    RequireRecognizer(__func__, recognizer).updated_time = Now();
    return 0;
}

int APS5_VABI sceSystemGestureUpdateTouchRecognizerRectangle(std::int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer, const SystemGestureRectangle* rectangle) {
    if (int handleError = CheckHandle(gesture_handle)) return handleError;
    if (recognizer == nullptr || rectangle == nullptr) return SCE_SYSTEM_GESTURE_ERROR_INVALID_ARGUMENT;
    RecognizerState& state = RequireRecognizer(__func__, recognizer);
    state.rectangle = *rectangle;
    state.updated_time = Now();
    return 0;
}

}
