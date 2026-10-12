#include "prx/libSceAgcDriver/Execution/include/Driver.hpp"
#include "prx/libSceAgcDriver/Execution/include/Pm4.hpp"
#include "prx/libSceAgcDriver/Execution/include/VulkanDevice.hpp"
#include "prx/libSceAgcDriver/Graphics/include/Draw.hpp"
#include "Recompiler.hpp"
#include "VulkanTestDevice.hpp"
#include <algorithm>
#include <array>
#include <cstdint>
#include <cstdio>
#include <iostream>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

using AgcDriver::Graphics::Require;
using ShaderRecompiler::ShaderStage;

constexpr std::uint32_t Threads = 64;
constexpr std::uint32_t Results = 4;
constexpr std::uint32_t GdsSlot = 0x40u;
constexpr std::uint64_t Seed = 0xfffffff0ull;
constexpr std::uint32_t Addend = 5u;
constexpr std::uint32_t Untouched = 0xdeadbeefu;
alignas(256) std::array<std::uint32_t, Threads * Results> Output{};

alignas(256) constexpr std::array<std::uint32_t, 13> Code{
    0x34020084, 0x7e0002c0, 0x7e040285, 0x7e060280, 0xd9820000, 0x04030200, 0xd9da0000, 0x06000000,
    0xe0741000, 0x80000401, 0xe0741008, 0x80000601, 0xbf810000,
};

std::array<std::uint32_t, 4> BufferDescriptor(const void* data, std::uint32_t bytes) {
    const auto address = reinterpret_cast<std::uintptr_t>(data);
    return {static_cast<std::uint32_t>(address), static_cast<std::uint32_t>((address >> 32u) & 0xffffu), bytes, 0x31016facu};
}

std::uint64_t* GdsQword() {
    return reinterpret_cast<std::uint64_t*>(AgcDriver::Pm4::GdsAddress() + GdsSlot);
}

void Run(AgcDriver::VulkanDevice& device, std::uint32_t threads, std::uint32_t waveSize) {
    Output.fill(Untouched);
    *GdsQword() = Seed;
    const std::span<const std::uint32_t> code(Code);
    const std::array<ShaderRecompiler::MemoryRegion, 1> memory{{{reinterpret_cast<std::uintptr_t>(Code.data()), std::as_bytes(code)}}};
    const std::array<std::uint32_t, 4> userData{BufferDescriptor(Output.data(), static_cast<std::uint32_t>(Output.size() * 4u))};
    std::vector<std::uint32_t> userDataWords(userData.begin(), userData.end());
    const ShaderRecompiler::ShaderComputeStageInfo compute{{threads, 1, 1}, 0, {false, false, false}, false, 1};
    ShaderRecompiler::RecompileRequest request{
        {ShaderStage::Compute, reinterpret_cast<std::uintptr_t>(Code.data()), code, 0, {}},
        {waveSize, 0, userDataWords, compute, std::nullopt, std::nullopt, memory},
        device.Target(),
        {0, 0, 0, 128}
    };
    request.useCache = false;
    device.Dispatch(ShaderRecompiler::Recompile(request), 1, 1, 1, {}, reinterpret_cast<std::uintptr_t>(Code.data()));
    device.WaitIdle();
}

void Check(std::uint32_t threads, const char* what) {
    const std::uint64_t finalValue = Seed + static_cast<std::uint64_t>(Addend) * threads;
    Require(*GdsQword() == finalValue, std::string(what) + ": the GDS slot is 0x" + [](std::uint64_t value) {
        char text[24];
        std::snprintf(text, sizeof(text), "%llx", static_cast<unsigned long long>(value));
        return std::string(text);
    }(*GdsQword()) + ", expected 0x" + [](std::uint64_t value) {
        char text[24];
        std::snprintf(text, sizeof(text), "%llx", static_cast<unsigned long long>(value));
        return std::string(text);
    }(finalValue));
    std::vector<std::uint64_t> chain(threads);
    for (std::uint32_t lane = 0; lane < threads; ++lane) {
        const std::uint32_t* words = &Output[lane * Results];
        const std::uint64_t returned = words[0] | (static_cast<std::uint64_t>(words[1]) << 32u);
        const std::uint64_t readBack = words[2] | (static_cast<std::uint64_t>(words[3]) << 32u);
        Require(readBack == finalValue, std::string(what) + ": lane " + std::to_string(lane) + " read back the wrong slot value");
        Require(returned >= Seed && returned < finalValue && (returned - Seed) % Addend == 0u,
            std::string(what) + ": lane " + std::to_string(lane) + " returned a value outside the add chain");
        chain[lane] = returned;
    }
    std::sort(chain.begin(), chain.end());
    for (std::uint32_t lane = 0; lane < threads; ++lane) {
        Require(chain[lane] == Seed + static_cast<std::uint64_t>(Addend) * lane,
            std::string(what) + ": the returned values lost a 64-bit exchange at position " + std::to_string(lane));
    }
}

}

int main() {
    try {
        const auto device = OpenVulkanTestDevice();
        if (!device) return VulkanTestSkipped;
        if (!TargetHasCapability(device->Target(), spv::CapabilityInt64Atomics)) {
            std::puts("skipped, the device has no 64-bit buffer atomics");
            return VulkanTestSkipped;
        }
        Run(*device, 32u, 32u);
        Check(32u, "wave32");
        Run(*device, 64u, 64u);
        Check(64u, "wave64");
        std::puts("gds 64-bit atomic tests passed");
        return 0;
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
