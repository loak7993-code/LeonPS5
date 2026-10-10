#include "prx/libSceAgc/DcbState/include/Workload.hpp"

#include "prx/libSceAgc/Command/include/Packet.hpp"
#include "prx/libSceAgc/Command/include/Workload.hpp"
#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

namespace {

constexpr std::uint32_t WorkloadActivePrefix = 0xcc000000u;
constexpr std::uint32_t WorkloadCompletePrefix = 0xcd000000u;
constexpr std::uint32_t WorkloadActiveControl = 0x267u;
constexpr std::uint32_t WorkloadCompleteControl = 0x275u;
constexpr std::uint32_t SemaphoreRegister = 0x342u;
constexpr std::uint32_t CompletionAddressRegister = 0xc343u;

void RequireStream(std::uint32_t stream_id, const char* function) {
    Agc::Command::Require(stream_id >= 1u && stream_id <= 31u, function, "stream id outside 1..31");
}

std::uint32_t* EmitCompletePacket(CommandBuffer* buf, std::uint32_t stream_id, std::uint64_t mask, std::uint64_t slot_address, const char* function) {
    auto* packet = Agc::Command::Allocate(buf, 9u, function);
    packet[0] = Agc::Command::Header(0x1eu, 9u);
    packet[1] = WorkloadCompleteControl;
    packet[2] = static_cast<std::uint32_t>(slot_address);
    packet[3] = static_cast<std::uint32_t>(slot_address >> 32u);
    packet[4] = static_cast<std::uint32_t>(mask);
    packet[5] = static_cast<std::uint32_t>(mask >> 32u);
    packet[6] = 0u;
    packet[7] = 0u;
    packet[8] = 0u;
    return packet;
}

}

extern "C" {

uint32_t* APS5_VABI sceAgcDcbSetWorkloadComplete(CommandBuffer* buf, uint32_t stream_id, uint32_t workload_id) {
    const auto* function = __func__;
    Agc::Command::Require(buf != nullptr, function, "null command buffer");
    RequireStream(stream_id, function);
    Agc::Command::Require(workload_id <= 63u, function, "workload id outside 0..63");
    const auto slot_address = Agc::Workload::GetStreamSlotAddress(stream_id, function);
    const auto mask = ~(std::uint64_t{1u} << workload_id);
    auto* first = Agc::Command::Allocate(buf, 3u, function);
    first[0] = Agc::Command::Header(0x79u, 3u);
    first[1] = SemaphoreRegister;
    first[2] = WorkloadCompletePrefix | (workload_id << 5u) | stream_id;
    EmitCompletePacket(buf, stream_id, mask, slot_address, function);
    return first;
}

uint32_t* APS5_VABI sceAgcDcbSetWorkloadsActive(CommandBuffer* buf, uint32_t stream_id, const uint32_t* workload_ids, uint32_t workload_count) {
    const auto* function = __func__;
    Agc::Command::Require(buf != nullptr, function, "null command buffer");
    RequireStream(stream_id, function);
    Agc::Command::Require(workload_ids != nullptr, function, "null workload id list");
    Agc::Command::Require(workload_count >= 1u && workload_count <= 63u, function, "workload count outside 1..63");
    std::uint64_t mask = 0u;
    for (std::uint32_t index = 0u; index < workload_count; ++index) {
        Agc::Command::Require(workload_ids[index] <= 63u, function, "workload id outside 0..63");
        Agc::Command::Require((mask & (std::uint64_t{1u} << workload_ids[index])) == 0u, function, "the same workload id appears twice");
        mask |= std::uint64_t{1u} << workload_ids[index];
    }
    const auto slot_address = Agc::Workload::GetStreamSlotAddress(stream_id, function);
    auto* first = Agc::Command::Allocate(buf, 4u, function);
    first[0] = Agc::Command::Header(0x79u, 4u);
    first[1] = SemaphoreRegister;
    first[2] = WorkloadActivePrefix | stream_id;
    first[3] = static_cast<std::uint32_t>(mask);
    auto* write = Agc::Command::Allocate(buf, 5u, function);
    write[0] = Agc::Command::Header(0x37u, 5u);
    write[1] = 0x06010000u;
    write[2] = CompletionAddressRegister;
    write[3] = static_cast<std::uint32_t>(mask >> 32u);
    write[4] = 0u;
    auto* workload = Agc::Command::Allocate(buf, 9u, function);
    workload[0] = Agc::Command::Header(0x1eu, 9u);
    workload[1] = WorkloadActiveControl;
    workload[2] = static_cast<std::uint32_t>(slot_address);
    workload[3] = static_cast<std::uint32_t>(slot_address >> 32u);
    workload[4] = static_cast<std::uint32_t>(mask);
    workload[5] = static_cast<std::uint32_t>(mask >> 32u);
    workload[6] = 0u;
    workload[7] = 0u;
    workload[8] = 0u;
    return first;
}

}
