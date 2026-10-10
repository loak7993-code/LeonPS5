#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

#include <string>

extern "C" {

std::int32_t APS5_VABI sceBluetoothHidInit() {
    return 0;
}

std::int32_t APS5_VABI sceBluetoothHidRegisterCallback(void* callback, std::int32_t flags, void* param) {
    (void)flags;
    (void)param;
    if (callback == nullptr) throw std::invalid_argument(std::string(__func__) + ": null callback");
    return 0;
}

std::int32_t APS5_VABI sceBluetoothHidUnregisterCallback() {
    return 0;
}

std::int32_t APS5_VABI sceBluetoothHidRegisterDevice(std::uint16_t vendorId, std::uint16_t productId) {
    (void)vendorId;
    (void)productId;
    return 0;
}

std::int32_t APS5_VABI sceBluetoothHidUnregisterDevice(std::uint16_t vendorId, std::uint16_t productId) {
    (void)vendorId;
    (void)productId;
    return 0;
}

int APS5_VABI sceBluetoothHidGetDeviceName() {
    throw std::runtime_error(std::string("sceBluetoothHidGetDeviceName") + " not implemented");
    return 0;

}

int APS5_VABI sceBluetoothHidGetInputReport() {
    throw std::runtime_error(std::string("sceBluetoothHidGetInputReport") + " not implemented");
    return 0;

}

int APS5_VABI sceBluetoothHidSetOutputReport() {
    throw std::runtime_error(std::string("sceBluetoothHidSetOutputReport") + " not implemented");
    return 0;

}

}
