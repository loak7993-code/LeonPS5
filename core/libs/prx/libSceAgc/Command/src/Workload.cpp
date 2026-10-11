#include "prx/libSceAgc/Command/include/Workload.hpp"

#include <cstring>
#include <stdexcept>
#include <string>

namespace Agc::Workload {

namespace {

void* g_ammMemory = nullptr;
std::uint64_t g_ammSize = 0;

}

void ResetAmmSemaphoreMemory() {
    g_ammMemory = nullptr;
    g_ammSize = 0;
}

void SetAmmSemaphoreMemory(void* memory, std::uint64_t size_in_bytes, const char* function) {
    if (g_ammMemory != nullptr) {
        throw std::runtime_error(std::string(function) + ": the semaphore memory is already registered");
    }
    if (memory == nullptr || size_in_bytes == 0) {
        throw std::invalid_argument(std::string(function) + ": null memory or zero size");
    }
    const auto address = reinterpret_cast<std::uintptr_t>(memory);
    if (((address | size_in_bytes) & 0x3fffu) != 0) {
        throw std::invalid_argument(std::string(function) + ": memory and size must be 64 KiB aligned");
    }
    std::memset(memory, 0, static_cast<std::size_t>(size_in_bytes));
    g_ammMemory = memory;
    g_ammSize = size_in_bytes;
}

std::uint64_t GetSemaphoreLabelAddress(std::uint32_t index, const char* function) {
    if (g_ammMemory == nullptr) {
        throw std::runtime_error(std::string(function) + ": the semaphore memory is not registered");
    }
    const auto end = (static_cast<std::uint64_t>(index) + 1u) * 32u;
    if (end > g_ammSize) {
        throw std::invalid_argument(std::string(function) + ": label index outside the registered memory");
    }
    return reinterpret_cast<std::uintptr_t>(g_ammMemory) + static_cast<std::uint64_t>(index) * 32u;
}

std::uint64_t GetStreamSlotAddress(std::uint32_t stream_id, const char* function) {
    if (g_ammMemory == nullptr) {
        throw std::runtime_error(std::string(function) + ": the semaphore memory is not registered");
    }
    if (stream_id < 1u || stream_id > 31u) {
        throw std::invalid_argument(std::string(function) + ": stream id outside 1..31");
    }
    const auto address = reinterpret_cast<std::uintptr_t>(g_ammMemory) + static_cast<std::uint64_t>(stream_id) * 8u;
    if (address + 8u > reinterpret_cast<std::uintptr_t>(g_ammMemory) + g_ammSize) {
        throw std::invalid_argument(std::string(function) + ": stream slot outside the registered memory");
    }
    return address;
}

}
