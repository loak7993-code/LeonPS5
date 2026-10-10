#include "prx/libSceAgc/Command/include/Workload.hpp"
#include "prx/libSceAgc/DcbState/include/Workload.hpp"
#include "prx/libSceAgc/Command/include/Packet.hpp"
#include "prx/libSceAgc/Command/include/Memory.hpp"

#include <cstdint>
#include <cstddef>
#include <cstring>
#include <stdexcept>
#include <string>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

namespace {

constexpr std::uint32_t MarkerPushSub = 0x0bu;
constexpr std::uint32_t MarkerSetSub = 0x0au;
constexpr std::uint32_t AcquireMemOpcode = 0x58u;
constexpr std::uint32_t InstrumentationBits = 0x1u;

std::uint32_t g_shaderInstrumentation = 0u;

std::uint32_t* EmitMarkerSpan(CommandBuffer* buf, std::uint32_t sub, const char* marker, std::uint32_t length, std::uint32_t color, const char* function) {
    Agc::Command::Require(buf != nullptr, function, "null command buffer");
    Agc::Command::Require(marker != nullptr || length == 0u, function, "null marker with nonzero length");
    const auto payload = (static_cast<std::uint64_t>(length) + 3u) / 4u;
    Agc::Command::Require(2u + payload <= 0x4001u, function, "marker span exceeds the packet size");
    const auto packet_dwords = static_cast<std::uint32_t>(2u + payload);
    auto* packet = Agc::Command::Allocate(buf, packet_dwords, function);
    packet[0] = Agc::Command::Header(0x10u, packet_dwords, sub << 2u);
    packet[1] = color;
    std::memset(packet + 2, 0, static_cast<std::size_t>(payload) * sizeof(std::uint32_t));
    if (length != 0u) std::memcpy(packet + 2, marker, length);
    return packet;
}

}

extern "C" {

uint32_t* APS5_VABI sceAgcDcbSetWorkloadComplete(CommandBuffer* buf, uint32_t stream_id, uint32_t workload_id);
uint32_t* APS5_VABI sceAgcDcbSetWorkloadsActive(CommandBuffer* buf, uint32_t stream_id, const uint32_t* workload_ids, uint32_t workload_count);

uint32_t* APS5_VABI sceAgcAcbPushMarkerSpan(CommandBuffer* buf, const char* marker, uint32_t length, uint32_t color) {
    return EmitMarkerSpan(buf, MarkerPushSub, marker, length, color, __func__);
}

uint32_t* APS5_VABI sceAgcAcbSetMarkerSpan(CommandBuffer* buf, const char* marker, uint32_t length, uint32_t color) {
    return EmitMarkerSpan(buf, MarkerSetSub, marker, length, color, __func__);
}

uint32_t* APS5_VABI sceAgcDcbPushMarkerSpan(CommandBuffer* buf, const char* marker, uint32_t length, uint32_t color) {
    return EmitMarkerSpan(buf, MarkerPushSub, marker, length, color, __func__);
}

uint32_t* APS5_VABI sceAgcDcbSetMarkerSpan(CommandBuffer* buf, const char* marker, uint32_t length, uint32_t color) {
    return EmitMarkerSpan(buf, MarkerSetSub, marker, length, color, __func__);
}

uint32_t* APS5_VABI sceAgcAcbSetWorkloadComplete(CommandBuffer* buf, uint32_t stream_id, uint32_t workload_id) {
    return sceAgcDcbSetWorkloadComplete(buf, stream_id, workload_id);
}

uint32_t* APS5_VABI sceAgcAcbSetWorkloadsActive(CommandBuffer* buf, uint32_t stream_id, const uint32_t* workload_ids, uint32_t workload_count) {
    return sceAgcDcbSetWorkloadsActive(buf, stream_id, workload_ids, workload_count);
}

uint32_t* APS5_VABI sceAgcAcbSetWorkloadStreamInactive(CommandBuffer* buf, uint32_t stream_id) {
    const auto* function = __func__;
    Agc::Command::Require(buf != nullptr, function, "null command buffer");
    Agc::Command::Require(stream_id >= 1u && stream_id <= 31u, function, "stream id outside 1..31");
    const auto slot_address = Agc::Workload::GetStreamSlotAddress(stream_id, function);
    auto* first = Agc::Command::Allocate(buf, 4u, function);
    first[0] = Agc::Command::Header(0x79u, 4u);
    first[1] = 0x342u;
    first[2] = 0xcc000000u | stream_id;
    first[3] = 0u;
    auto* write = Agc::Command::Allocate(buf, 5u, function);
    write[0] = Agc::Command::Header(0x37u, 5u);
    write[1] = 0x06010000u;
    write[2] = 0xc343u;
    write[3] = 0u;
    write[4] = 0u;
    auto* workload = Agc::Command::Allocate(buf, 9u, function);
    workload[0] = Agc::Command::Header(0x1eu, 9u);
    workload[1] = 0x267u;
    workload[2] = static_cast<std::uint32_t>(slot_address);
    workload[3] = static_cast<std::uint32_t>(slot_address >> 32u);
    workload[4] = 0u;
    workload[5] = 0u;
    workload[6] = 0u;
    workload[7] = 0u;
    workload[8] = 0u;
    return first;
}

uint32_t* APS5_VABI sceAgcDcbSetWorkloadStreamInactive(CommandBuffer* buf, uint32_t stream_id) {
    return sceAgcAcbSetWorkloadStreamInactive(buf, stream_id);
}

int APS5_VABI sceAgcAcquireMemSetEngine(uint32_t* cmd, uint32_t engine) {
    const auto* function = __func__;
    Agc::Command::Require(cmd != nullptr, function, "null packet");
    Agc::Command::Require(((cmd[0] >> 8u) & 0xffu) == AcquireMemOpcode, function, "the packet is not an ACQUIRE_MEM");
    Agc::Command::Require(engine <= 1u, function, "engine outside 0..1");
    cmd[1] = (cmd[1] & 0x7fffffffu) | ((engine & 1u) << 31u);
    return 0;
}

int APS5_VABI sceAgcGetSemaphoreLabel(uint32_t index, void** label) {
    const auto* function = __func__;
    if (label == nullptr) throw std::invalid_argument(std::string(function) + ": null label output");
    *label = reinterpret_cast<void*>(Agc::Workload::GetSemaphoreLabelAddress(index, function));
    return 0;
}

int APS5_VABI sceAgcSetAmmSemaphoreMemory(void* memory, uint64_t size_in_bytes) {
    Agc::Workload::SetAmmSemaphoreMemory(memory, size_in_bytes, __func__);
    return 0;
}

int APS5_VABI sceAgcSetSemaphoreMemory(void* memory, uint64_t size_in_bytes) {
    Agc::Workload::SetAmmSemaphoreMemory(memory, size_in_bytes, __func__);
    return 0;
}

int APS5_VABI sceAgcGetGsPrimPayload(uint32_t* payload_out, const Shader* shader) {
    const auto* function = __func__;
    Agc::Command::Require(payload_out != nullptr && shader != nullptr, function, "null payload output or shader");
    *payload_out = 0u;
    if (shader->num_cx_registers == 0u) return 0;
    Agc::Command::Require(shader->cx_registers != nullptr, function, "cx_registers is null but num_cx_registers is nonzero");
    for (std::uint32_t index = 0u; index < shader->num_cx_registers; ++index) {
        if (shader->cx_registers[index].offset == 0x1c2u) {
            if ((shader->cx_registers[index].value & 0xfu) == 2u) *payload_out = 8u;
            break;
        }
    }
    return 0;
}

uint32_t APS5_VABI sceAgcGetShaderInstrumentation() {
    return g_shaderInstrumentation;
}

int APS5_VABI sceAgcSetShaderInstrumentation(uint32_t flags) {
    Agc::Command::Require((flags & ~InstrumentationBits) == 0u, __func__, "reserved instrumentation bits are set");
    g_shaderInstrumentation = flags;
    return 0;
}

int APS5_VABI sceAgcDebugRaiseException() {
    return 0;
}

int APS5_VABI sceAgcGetDefaultCxStateFlat(void* out_state, uint32_t size) {
    (void)out_state;
    (void)size;
    throw std::runtime_error(std::string(__func__) + ": the flat context-state layout is unverified");
}

int APS5_VABI sceAgcCbMemsetExclusive(CommandBuffer* buf, uint64_t destination, const void* pattern16, uint64_t size_bytes) {
    (void)buf;
    (void)destination;
    (void)pattern16;
    (void)size_bytes;
    throw std::runtime_error(std::string(__func__) + ": the exclusive-memset packet embeds a compute shader this port does not ship");
}

int APS5_VABI sceAgcBranchPatchSetThenTarget_0300() {
    throw std::runtime_error(std::string(__func__) + ": the branch-patch target encoding is unverified");
}

int APS5_VABI sceAgcBranchPatchSetElseTarget_0300() {
    throw std::runtime_error(std::string(__func__) + ": the branch-patch target encoding is unverified");
}

int APS5_VABI sceAgcUnknown_vieBRwlh1Lw() {
    return 0;
}

}
