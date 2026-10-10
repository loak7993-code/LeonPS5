#include "prx/libSceAgc/Acb/include/Control.hpp"

#include "prx/libSceAgc/Command/include/Control.hpp"
#include "prx/libSceAgc/Command/include/Memory.hpp"
#include "prx/libSceAgc/Command/include/Packet.hpp"
#include "prx/libSceAgc/DcbState/include/Marker.hpp"
#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

extern "C" {

// unknown signature
std::uint32_t* APS5_VABI sceAgcAcbAtomicGds_0900(CommandBuffer* buf, std::uint32_t control, std::uint32_t mode, std::uint32_t gds_op, std::uint32_t src, std::uint16_t offset, std::uint16_t index, std::uint32_t mask, std::uint32_t data, std::uint64_t compare_data, std::uint64_t extra_data) {
    const auto* function = __func__;
    Agc::Command::Require(buf != nullptr, function, "null command buffer");
    auto control_word = control & 0xffu;
    control_word |= (control << 7u) & 0x00010000u;
    control_word |= (control & 0x20u) << 13u;
    control_word |= (control & 0x40u) << 14u;
    if ((control & 0x20u) == 0u && mode == 1u) control_word |= 0x00020000u;
    auto* packet = Agc::Command::Allocate(buf, 11u, function);
    packet[0] = Agc::Command::Header(0x1du, 11u);
    packet[1] = control_word;
    packet[2] = ((gds_op & 1u) << 8u) | (src & 0x3fu);
    packet[3] = offset;
    packet[4] = index;
    packet[5] = mask & 0x00ff00ffu;
    packet[6] = data;
    packet[7] = static_cast<std::uint32_t>(compare_data);
    packet[8] = static_cast<std::uint32_t>(compare_data >> 32u);
    packet[9] = static_cast<std::uint32_t>(extra_data);
    packet[10] = static_cast<std::uint32_t>(extra_data >> 32u);
    return packet;
}

std::uint32_t* APS5_VABI sceAgcAcbJump(CommandBuffer* buf, std::uint8_t cachePolicy, const std::uint32_t* target, std::uint32_t sizeInDwords) {
    return Agc::Command::WriteJump(buf, 1, cachePolicy, target, sizeInDwords, __func__);
}

uint32_t APS5_VABI sceAgcAcbJumpGetSize(void) {
    return 16;
}

// Encoded as the custom DISPATCH_RESET NOP packet the driver consumes on compute queues.
uint32_t* APS5_VABI sceAgcAcbResetQueue(CommandBuffer* buf, uint32_t op, uint32_t value) {
    (void)value;
    Agc::Command::Require(buf != nullptr, __func__, "null command buffer");
    constexpr std::uint32_t OpcodeNop = 0x10;
    constexpr std::uint32_t CustomDispatchReset = 0x09;
    auto* packet = Agc::Command::Allocate(buf, 2, __func__);
    packet[0] = Agc::Command::Header(OpcodeNop, 2, CustomDispatchReset << 2);
    packet[1] = op;
    return packet;
}

std::uint32_t* APS5_VABI sceAgcAcbRewind(CommandBuffer* buf, std::uint32_t initialState) {
    return Agc::Command::WriteRewind(buf, initialState, __func__);
}

std::uint32_t APS5_VABI sceAgcAcbRewindGetSize() {
    return 8;
}

std::uint32_t* APS5_VABI sceAgcAcbWaitUntilSafeForRendering(CommandBuffer* buf, std::uint32_t videoOutHandle, std::uint32_t displayBufferIndex) {
    const auto* function = __func__;
    Agc::Command::Require(buf != nullptr, function, "null command buffer");
    auto* packet = Agc::Command::Allocate(buf, 4u, function);
    packet[0] = 0xc0021018u;
    packet[1] = videoOutHandle;
    packet[2] = displayBufferIndex;
    packet[3] = 0u;
    return packet;
}

std::uint32_t* APS5_VABI sceAgcAcbSetFlip(CommandBuffer* buf, std::uint32_t videoOutHandle, std::int32_t displayBufferIndex, std::uint32_t flipMode, std::int64_t flipArg) {
    (void)buf;
    (void)videoOutHandle;
    (void)displayBufferIndex;
    (void)flipMode;
    (void)flipArg;
    throw std::runtime_error(std::string(__func__) + ": the flip packet layout is unverified, so the call throws instead of emitting a wrong packet");
}

uint32_t* APS5_VABI sceAgcAcbPushMarker(CommandBuffer* buf, const char* str, uint32_t color) {
    (void)color;
    return Agc::Marker::Push(buf, str, __func__);
}

uint32_t* APS5_VABI sceAgcAcbPopMarker(CommandBuffer* buf) {
    return Agc::Marker::Pop(buf, __func__);
}

uint32_t* APS5_VABI sceAgcAcbSetMarker(CommandBuffer* buf, const char* str, uint32_t color) {
    (void)color;
    auto* packet = Agc::Marker::Push(buf, str, __func__);
    Agc::Marker::Pop(buf, __func__);
    return packet;
}

}
