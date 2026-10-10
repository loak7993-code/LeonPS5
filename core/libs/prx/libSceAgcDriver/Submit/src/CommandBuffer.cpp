#include "prx/libSceAgcDriver/Submit/include/CommandBuffer.hpp"
#include "prx/libSceAgcDriver/Submit/include/Dcb.hpp"
#include "prx/libSceAgcDriver/Execution/include/Driver.hpp"
#include "prx/libSceAgcDriver/Execution/include/GuestMemory.hpp"

#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

namespace {

std::uint32_t QueueFromContext(const void* queue_context, const char* function) {
    const auto value = reinterpret_cast<std::uintptr_t>(queue_context);
    if (value == 0) return 0;
    if (value >= 0x20u && value < 0x58u) return static_cast<std::uint32_t>(value);
    throw std::runtime_error(std::string(function) + ": the queue context is neither the graphics queue nor a compute queue id");
}

}

extern "C" {

int APS5_VABI sceAgcDriverSubmitCommandBuffer(void* queue_context, const Packet* packet) {
    const auto* function = __func__;
    if (packet == nullptr || packet->addr == nullptr || packet->dw_num == 0) {
        throw std::invalid_argument(std::string(function) + ": null packet");
    }
    AgcDriver::GuestMemory::CheckRange(packet->addr, packet->dw_num * sizeof(std::uint32_t), alignof(std::uint32_t));
    AgcDriver::Submit(packet, QueueFromContext(queue_context, function));
    return 0;
}

int APS5_VABI sceAgcDriverSubmitMultiCommandBuffers(void* queue_context, uint32_t* const* command_buffers, const uint32_t* sizes_in_dwords, uint32_t count) {
    if (count == 0) return 0;
    const auto* function = __func__;
    if (command_buffers == nullptr || sizes_in_dwords == nullptr) {
        throw std::invalid_argument(std::string(function) + ": null command-buffer arrays");
    }
    const auto queue = QueueFromContext(queue_context, function);
    return AgcDriver::SubmitMany(command_buffers, sizes_in_dwords, count, queue);
}

}
