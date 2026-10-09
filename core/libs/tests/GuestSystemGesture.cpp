#include "SceTypes.hpp"
#include "prx/libc/include/general/VabiMacros.hpp"

#include <array>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <functional>
#include <stdexcept>

extern "C" {
int32_t APS5_VABI sceSystemGestureOpen(int32_t input_type, const void* param);
int APS5_VABI sceSystemGestureClose(int32_t gesture_handle);
int APS5_VABI sceSystemGestureCreateTouchRecognizer(int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer, int32_t type, const SystemGestureRectangle* rectangle, const void* param);
int APS5_VABI sceSystemGestureAppendTouchRecognizer(int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer);
int APS5_VABI sceSystemGestureRemoveTouchRecognizer(int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer);
int APS5_VABI sceSystemGestureResetTouchRecognizer(int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer);
int APS5_VABI sceSystemGestureResetPrimitiveTouchRecognizer(int32_t gesture_handle);
int APS5_VABI sceSystemGestureUpdateAllTouchRecognizer(int32_t gesture_handle);
int APS5_VABI sceSystemGestureUpdateTouchRecognizer(int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer);
int APS5_VABI sceSystemGestureUpdateTouchRecognizerRectangle(int32_t gesture_handle, SystemGestureTouchRecognizer* recognizer, const SystemGestureRectangle* rectangle);
int APS5_VABI sceSystemGestureUpdatePrimitiveTouchRecognizer(int32_t gesture_handle, const void* param);
int APS5_VABI sceSystemGestureInitializePrimitiveTouchRecognizer(const void* param);
int APS5_VABI sceSystemGestureFinalizePrimitiveTouchRecognizer(void);
int APS5_VABI sceSystemGestureGetTouchRecognizerInformation(int32_t gesture_handle, const SystemGestureTouchRecognizer* recognizer, SystemGestureTouchRecognizerInformation* information);
int APS5_VABI sceSystemGestureGetTouchEventsCount(int32_t gesture_handle, const SystemGestureTouchRecognizer* recognizer);
int APS5_VABI sceSystemGestureGetTouchEvents(int32_t gesture_handle, const SystemGestureTouchRecognizer* recognizer, SystemGestureTouchEvent* event_buffer, uint32_t capacity_of_buffer, uint32_t* number_of_event);
int APS5_VABI sceSystemGestureGetTouchEventByIndex(int32_t gesture_handle, const SystemGestureTouchRecognizer* recognizer, uint32_t index, SystemGestureTouchEvent* event);
int APS5_VABI sceSystemGestureGetTouchEventByEventID(int32_t gesture_handle, const SystemGestureTouchRecognizer* recognizer, uint32_t eventId, SystemGestureTouchEvent* event);
int APS5_VABI sceSystemGestureGetPrimitiveTouchEventsCount(int32_t gesture_handle);
int APS5_VABI sceSystemGestureGetPrimitiveTouchEvents(int32_t gesture_handle, SystemGesturePrimitiveTouchEvent* event_buffer, uint32_t capacity_of_buffer, uint32_t* number_of_event);
int APS5_VABI sceSystemGestureGetPrimitiveTouchEventByIndex(int32_t gesture_handle, uint32_t index, SystemGesturePrimitiveTouchEvent* event);
int APS5_VABI sceSystemGestureGetPrimitiveTouchEventByPrimitiveID(int32_t gesture_handle, uint16_t primitiveId, SystemGesturePrimitiveTouchEvent* event);
}

namespace {

constexpr int INVALID_ARGUMENT = static_cast<int>(0x80D10002);
constexpr int INVALID_HANDLE = static_cast<int>(0x80D10003);
constexpr int INDEX_OUT_OF_ARRAY = static_cast<int>(0x80D10005);

void Require(bool condition, const char* message) {
    if (!condition) {
        std::fprintf(stderr, "SystemGesture: %s\n", message);
        std::abort();
    }
}

void RequireThrows(const char* message, const std::function<void()>& call) {
    bool threw = false;
    try {
        call();
    } catch (const std::runtime_error&) {
        threw = true;
    }
    Require(threw, message);
}

void RequireError(const char* message, int result, int expected) {
    Require(result == expected, message);
}

}

int main() {
    std::int32_t open = sceSystemGestureOpen(0, nullptr);
    Require(open == 1, "open returned no handle");
    RequireError("an invalid handle was accepted", sceSystemGestureCreateTouchRecognizer(2, nullptr, 0, nullptr, nullptr), INVALID_HANDLE);
    RequireError("an invalid handle was accepted", sceSystemGestureGetTouchEventsCount(2, nullptr), INVALID_HANDLE);
    RequireError("an invalid handle was accepted", sceSystemGestureUpdateAllTouchRecognizer(2), INVALID_HANDLE);
    RequireError("an invalid handle was accepted", sceSystemGestureResetPrimitiveTouchRecognizer(2), INVALID_HANDLE);

    SystemGestureTouchRecognizer recognizer {};
    SystemGestureTouchRecognizer unknown {};
    SystemGestureRectangle rectangle {1.0f, 2.0f, 30.0f, 40.0f, {}};
    RequireError("a null recognizer was accepted", sceSystemGestureCreateTouchRecognizer(open, nullptr, 0, &rectangle, nullptr), INVALID_ARGUMENT);
    RequireError("a null rectangle was accepted", sceSystemGestureCreateTouchRecognizer(open, &recognizer, 0, nullptr, nullptr), INVALID_ARGUMENT);
    RequireError("creating a recognizer failed", sceSystemGestureCreateTouchRecognizer(open, &recognizer, 3, &rectangle, nullptr), 0);

    SystemGestureTouchRecognizerInformation information {};
    RequireError("information query failed", sceSystemGestureGetTouchRecognizerInformation(open, &recognizer, &information), 0);
    Require(information.gesture_type == 3, "the gesture type was not stored");
    Require(information.rectangle.x == 1.0f && information.rectangle.y == 2.0f && information.rectangle.width == 30.0f && information.rectangle.height == 40.0f, "the rectangle was not stored");
    Require(information.updated_time != 0, "the update time was not recorded");
    RequireError("a null information pointer was accepted", sceSystemGestureGetTouchRecognizerInformation(open, &recognizer, nullptr), INVALID_ARGUMENT);
    RequireThrows("an unregistered recognizer was accepted", [&] { sceSystemGestureGetTouchRecognizerInformation(open, &unknown, &information); });

    RequireError("appending a recognizer failed", sceSystemGestureAppendTouchRecognizer(open, &recognizer), 0);
    RequireError("a null recognizer was accepted", sceSystemGestureAppendTouchRecognizer(open, nullptr), INVALID_ARGUMENT);
    RequireError("appending reset the recognizer", sceSystemGestureGetTouchRecognizerInformation(open, &recognizer, &information), 0);
    Require(information.gesture_type == 3, "appending reset the gesture type");

    SystemGestureRectangle moved {5.0f, 6.0f, 10.0f, 11.0f, {}};
    RequireError("a null rectangle was accepted", sceSystemGestureUpdateTouchRecognizerRectangle(open, &recognizer, nullptr), INVALID_ARGUMENT);
    RequireError("updating the rectangle failed", sceSystemGestureUpdateTouchRecognizerRectangle(open, &recognizer, &moved), 0);
    RequireError("information query failed", sceSystemGestureGetTouchRecognizerInformation(open, &recognizer, &information), 0);
    Require(information.rectangle.x == 5.0f && information.rectangle.width == 10.0f, "the rectangle was not updated");
    Require(information.gesture_type == 3, "updating the rectangle reset the gesture type");

    RequireError("updating a recognizer failed", sceSystemGestureUpdateTouchRecognizer(open, &recognizer), 0);
    RequireError("a null recognizer was accepted", sceSystemGestureUpdateTouchRecognizer(open, nullptr), INVALID_ARGUMENT);
    RequireThrows("an unregistered recognizer was accepted", [&] { sceSystemGestureUpdateTouchRecognizer(open, &unknown); });
    RequireError("resetting a recognizer failed", sceSystemGestureResetTouchRecognizer(open, &recognizer), 0);
    RequireError("a null recognizer was accepted", sceSystemGestureResetTouchRecognizer(open, nullptr), INVALID_ARGUMENT);
    RequireThrows("an unregistered recognizer was accepted", [&] { sceSystemGestureResetTouchRecognizer(open, &unknown); });
    RequireError("resetting all recognizers failed", sceSystemGestureUpdateAllTouchRecognizer(open), 0);

    RequireError("removing a recognizer failed", sceSystemGestureRemoveTouchRecognizer(open, &recognizer), 0);
    RequireError("a null recognizer was accepted", sceSystemGestureRemoveTouchRecognizer(open, nullptr), INVALID_ARGUMENT);
    RequireThrows("a removed recognizer was still registered", [&] { sceSystemGestureRemoveTouchRecognizer(open, &recognizer); });
    RequireError("recreating a recognizer failed", sceSystemGestureCreateTouchRecognizer(open, &recognizer, 3, &rectangle, nullptr), 0);

    RequireError("the event count was not empty", sceSystemGestureGetTouchEventsCount(open, &recognizer), 0);
    RequireThrows("an unregistered recognizer was accepted", [&] { sceSystemGestureGetTouchEventsCount(open, &unknown); });

    std::array<SystemGestureTouchEvent, 2> events {};
    std::uint32_t count = 7;
    RequireError("the event query failed", sceSystemGestureGetTouchEvents(open, &recognizer, events.data(), static_cast<std::uint32_t>(events.size()), &count), 0);
    Require(count == 0, "an event was reported without touch input");
    RequireError("a null count was accepted", sceSystemGestureGetTouchEvents(open, &recognizer, events.data(), static_cast<std::uint32_t>(events.size()), nullptr), INVALID_ARGUMENT);
    RequireError("a null buffer was accepted", sceSystemGestureGetTouchEvents(open, &recognizer, nullptr, 1, &count), INVALID_ARGUMENT);
    RequireError("a null count was accepted", sceSystemGestureGetTouchEvents(open, &recognizer, nullptr, 0, nullptr), INVALID_ARGUMENT);
    RequireThrows("an unregistered recognizer was accepted", [&] { sceSystemGestureGetTouchEvents(open, &unknown, events.data(), static_cast<std::uint32_t>(events.size()), &count); });
    RequireError("an index outside the empty stream was not reported", sceSystemGestureGetTouchEventByIndex(open, &recognizer, 0, events.data()), INDEX_OUT_OF_ARRAY);
    RequireError("a null event was accepted", sceSystemGestureGetTouchEventByIndex(open, &recognizer, 0, nullptr), INVALID_ARGUMENT);
    RequireError("an unknown event id was accepted", sceSystemGestureGetTouchEventByEventID(open, &recognizer, 1, events.data()), INVALID_ARGUMENT);
    RequireThrows("an unregistered recognizer was accepted", [&] { sceSystemGestureGetTouchEventByIndex(open, &unknown, 0, events.data()); });

    RequireError("initializing the primitive recognizer failed", sceSystemGestureInitializePrimitiveTouchRecognizer(nullptr), 0);
    RequireError("updating the primitive recognizer failed", sceSystemGestureUpdatePrimitiveTouchRecognizer(open, nullptr), 0);
    RequireError("an invalid handle was accepted", sceSystemGestureUpdatePrimitiveTouchRecognizer(2, nullptr), INVALID_HANDLE);
    RequireError("finalizing the primitive recognizer failed", sceSystemGestureFinalizePrimitiveTouchRecognizer(), 0);
    RequireError("resetting the primitive recognizer failed", sceSystemGestureResetPrimitiveTouchRecognizer(open), 0);

    RequireError("the primitive event count was not empty", sceSystemGestureGetPrimitiveTouchEventsCount(open), 0);
    RequireError("an invalid handle was accepted", sceSystemGestureGetPrimitiveTouchEventsCount(2), INVALID_HANDLE);
    std::array<SystemGesturePrimitiveTouchEvent, 2> primitiveEvents {};
    count = 7;
    RequireError("the primitive event query failed", sceSystemGestureGetPrimitiveTouchEvents(open, primitiveEvents.data(), static_cast<std::uint32_t>(primitiveEvents.size()), &count), 0);
    Require(count == 0, "a primitive event was reported without touch input");
    RequireError("a null count was accepted", sceSystemGestureGetPrimitiveTouchEvents(open, primitiveEvents.data(), static_cast<std::uint32_t>(primitiveEvents.size()), nullptr), INVALID_ARGUMENT);
    RequireError("a null buffer was accepted", sceSystemGestureGetPrimitiveTouchEvents(open, nullptr, 1, &count), INVALID_ARGUMENT);
    RequireError("an index outside the empty stream was not reported", sceSystemGestureGetPrimitiveTouchEventByIndex(open, 0, primitiveEvents.data()), INDEX_OUT_OF_ARRAY);
    RequireError("a null event was accepted", sceSystemGestureGetPrimitiveTouchEventByIndex(open, 0, nullptr), INVALID_ARGUMENT);
    RequireError("an unknown primitive id was accepted", sceSystemGestureGetPrimitiveTouchEventByPrimitiveID(open, 7, primitiveEvents.data()), INVALID_ARGUMENT);
    RequireError("a null event was accepted", sceSystemGestureGetPrimitiveTouchEventByPrimitiveID(open, 7, nullptr), INVALID_ARGUMENT);

    RequireError("closing the handle failed", sceSystemGestureClose(open), 0);
    RequireError("an invalid handle was accepted", sceSystemGestureClose(2), INVALID_HANDLE);
    RequireThrows("a recognizer survived closing the handle", [&] { sceSystemGestureGetTouchRecognizerInformation(open, &recognizer, &information); });

    std::puts("SystemGesture tests passed");
    return 0;
}
