#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

#include <chrono>
#include <string>
#include <thread>

namespace {

constexpr std::int32_t SCE_USBD_ERROR_INVALID_ARG = static_cast<std::int32_t>(0x80240002);

struct UsbdTimeval {
    std::int64_t seconds;
    std::int64_t microseconds;
};

void* g_emptyDeviceList[1] = {nullptr};

}

extern "C" {

std::int32_t APS5_VABI sceUsbdInit() {
    return 0;
}

void APS5_VABI sceUsbdExit() {
}

std::int64_t APS5_VABI sceUsbdGetDeviceList(void*** list) {
    if (list == nullptr) return SCE_USBD_ERROR_INVALID_ARG;
    *list = g_emptyDeviceList;
    return 0;
}

void APS5_VABI sceUsbdFreeDeviceList(void** list, std::int32_t unrefDevices) {
    (void)unrefDevices;
    if (list != nullptr && list != g_emptyDeviceList) throw std::runtime_error(std::string(__func__) + ": list was not returned by sceUsbdGetDeviceList");
}

std::int32_t APS5_VABI sceUsbdHandleEventsTimeout(const UsbdTimeval* timeout) {
    if (timeout == nullptr || timeout->seconds < 0 || timeout->microseconds < 0 || timeout->microseconds >= 1000000) return SCE_USBD_ERROR_INVALID_ARG;
    std::this_thread::sleep_for(std::chrono::seconds(timeout->seconds) + std::chrono::microseconds(timeout->microseconds));
    return 0;
}

int APS5_VABI sceUsbdAllocTransfer() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdAttachKernelDriver() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdCancelTransfer() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdCheckConnected() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdClaimInterface() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdClose() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdControlTransfer() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdEventHandlingOk() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdFillInterruptTransfer() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdFreeConfigDescriptor() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdFreeTransfer() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdGetActiveConfigDescriptor() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdGetBusNumber() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdGetConfigDescriptor() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdGetDeviceAddress() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdGetDeviceDescriptor() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdGetStringDescriptor() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdKernelDriverActive() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdOpen() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdRefDevice() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdReleaseInterface() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdResetDevice() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdSetConfiguration() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdSubmitTransfer() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

int APS5_VABI sceUsbdUnrefDevice() {
    throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

}
