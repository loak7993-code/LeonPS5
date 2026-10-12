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

constexpr std::uint32_t MaxThreads = 64;
constexpr std::uint32_t Results = 4;
constexpr std::uint32_t GdsSlot = 0x40u;
constexpr std::uint64_t Seed = 0xfffffff0ull;
constexpr std::uint32_t Addend = 5u;
constexpr std::uint32_t MinSeed = 10u;
constexpr std::uint32_t SwapIn = 7u;
constexpr std::uint32_t Untouched = 0xdeadbeefu;
alignas(256) std::array<std::uint32_t, MaxThreads * Results> Output{};
alignas(256) std::array<std::uint32_t, MaxThreads> MinInput{};

alignas(256) constexpr std::array<std::uint32_t, 13> AddCode{
    0x34020084, 0x7e0002c0, 0x7e040285, 0x7e060280, 0xd9820000, 0x04030200, 0xd9da0000, 0x06000000,
    0xe0741000, 0x80000401, 0xe0741008, 0x80000601, 0xbf810000,
};

alignas(256) constexpr std::array<std::uint32_t, 13> MinCode{
    0x34020082, 0x34040083, 0x7e0002c0, 0xe0301000, 0x80000401, 0xbf8c3f70, 0xd89e0000, 0x05000400,
    0xd8da0000, 0x06000000, 0xe0741000, 0x80010502, 0xbf810000,
};

alignas(256) constexpr std::array<std::uint32_t, 10> SwapCode{
    0x34040083, 0x7e0002c0, 0x7e060287, 0xd8b60000, 0x06000300, 0xd8da0000, 0x07000000, 0xe0741000,
    0x80000602, 0xbf810000,
};

std::array<std::uint32_t, 4> BufferDescriptor(const void* data, std::uint32_t bytes) {
    const auto address = reinterpret_cast<std::uintptr_t>(data);
    return {static_cast<std::uint32_t>(address), static_cast<std::uint32_t>((address >> 32u) & 0xffffu), bytes, 0x31016facu};
}

std::uint64_t* GdsQword() {
    return reinterpret_cast<std::uint64_t*>(AgcDriver::Pm4::GdsAddress() + GdsSlot);
}

std::uint32_t* GdsWord() {
    return reinterpret_cast<std::uint32_t*>(AgcDriver::Pm4::GdsAddress() + GdsSlot);
}

void Dispatch(AgcDriver::VulkanDevice& device, std::span<const std::uint32_t> code, std::uint32_t threads,
    std::uint32_t waveSize, const std::vector<std::uint32_t>& userData) {
    const std::array<ShaderRecompiler::MemoryRegion, 1> memory{{{reinterpret_cast<std::uintptr_t>(code.data()), std::as_bytes(code)}}};
    const ShaderRecompiler::ShaderComputeStageInfo compute{{threads, 1, 1}, 0, {false, false, false}, false, 1};
    ShaderRecompiler::RecompileRequest request{
        {ShaderStage::Compute, reinterpret_cast<std::uintptr_t>(code.data()), code, 0, {}},
        {waveSize, 0, userData, compute, std::nullopt, std::nullopt, memory},
        device.Target(),
        {0, 0, 0, 128}
    };
    request.useCache = false;
    device.Dispatch(ShaderRecompiler::Recompile(request), 1, 1, 1, {}, reinterpret_cast<std::uintptr_t>(code.data()));
    device.WaitIdle();
}

std::string Hex64(std::uint64_t value) {
    char text[24];
    std::snprintf(text, sizeof(text), "%llx", static_cast<unsigned long long>(value));
    return text;
}

void RunAdd(AgcDriver::VulkanDevice& device, std::uint32_t threads, std::uint32_t waveSize) {
    Output.fill(Untouched);
    *GdsQword() = Seed;
    const auto output = BufferDescriptor(Output.data(), static_cast<std::uint32_t>(Output.size() * 4u));
    const std::vector<std::uint32_t> userData(output.begin(), output.end());
    const std::span<const std::uint32_t> code(AddCode);
    Dispatch(device, code, threads, waveSize, userData);
}

void CheckAdd(std::uint32_t threads, const char* what) {
    const std::uint64_t finalValue = Seed + static_cast<std::uint64_t>(Addend) * threads;
    Require(*GdsQword() == finalValue, std::string(what) + ": the GDS slot is 0x" + Hex64(*GdsQword()) + ", expected 0x" + Hex64(finalValue));
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

void RunMin(AgcDriver::VulkanDevice& device) {
    constexpr std::uint32_t threads = 32u;
    for (std::uint32_t lane = 0; lane < threads; ++lane) MinInput[lane] = 20u + lane;
    Output.fill(Untouched);
    *GdsWord() = MinSeed;
    const auto input = BufferDescriptor(MinInput.data(), static_cast<std::uint32_t>(MinInput.size() * 4u));
    const auto output = BufferDescriptor(Output.data(), static_cast<std::uint32_t>(Output.size() * 4u));
    std::vector<std::uint32_t> userData;
    userData.insert(userData.end(), input.begin(), input.end());
    userData.insert(userData.end(), output.begin(), output.end());
    const std::span<const std::uint32_t> code(MinCode);
    Dispatch(device, code, threads, 32u, userData);
}

void CheckMin(std::uint32_t threads, const char* what) {
    Require(*GdsWord() == MinSeed, std::string(what) + ": the GDS slot is " + std::to_string(*GdsWord()) + ", expected the untouched minimum " + std::to_string(MinSeed));
    for (std::uint32_t lane = 0; lane < threads; ++lane) {
        Require(Output[lane * 2u] == MinSeed, std::string(what) + ": lane " + std::to_string(lane) + " returned " + std::to_string(Output[lane * 2u]) + ", expected the minimum " + std::to_string(MinSeed));
        Require(Output[lane * 2u + 1u] == MinSeed, std::string(what) + ": lane " + std::to_string(lane) + " read back " + std::to_string(Output[lane * 2u + 1u]) + ", expected the minimum " + std::to_string(MinSeed));
    }
    for (std::uint32_t word = threads * 2u; word < Output.size(); ++word) {
        Require(Output[word] == Untouched, std::string(what) + ": word " + std::to_string(word) + " was written");
    }
}

void RunSwap(AgcDriver::VulkanDevice& device, std::uint32_t threads, std::uint32_t waveSize) {
    Output.fill(Untouched);
    *GdsWord() = MinSeed;
    const auto output = BufferDescriptor(Output.data(), static_cast<std::uint32_t>(Output.size() * 4u));
    const std::vector<std::uint32_t> userData(output.begin(), output.end());
    const std::span<const std::uint32_t> code(SwapCode);
    Dispatch(device, code, threads, waveSize, userData);
}

void CheckSwap(std::uint32_t threads, const char* what) {
    Require(*GdsWord() == SwapIn, std::string(what) + ": the GDS slot is " + std::to_string(*GdsWord()) + ", expected the swapped-in " + std::to_string(SwapIn));
    std::uint32_t sawSeed = 0u;
    std::uint32_t sawSwapIn = 0u;
    for (std::uint32_t lane = 0; lane < threads; ++lane) {
        Require(Output[lane * 2u + 1u] == SwapIn, std::string(what) + ": lane " + std::to_string(lane) + " read back " + std::to_string(Output[lane * 2u + 1u]) + ", expected " + std::to_string(SwapIn));
        if (Output[lane * 2u] == MinSeed) ++sawSeed;
        else if (Output[lane * 2u] == SwapIn) ++sawSwapIn;
        else Require(false, std::string(what) + ": lane " + std::to_string(lane) + " returned " + std::to_string(Output[lane * 2u]) + ", which is neither the seed nor the swap-in");
    }
    for (std::uint32_t word = threads * 2u; word < Output.size(); ++word) {
        Require(Output[word] == Untouched, std::string(what) + ": word " + std::to_string(word) + " was written");
    }
    Require(sawSeed == 1u, std::string(what) + ": " + std::to_string(sawSeed) + " lanes saw the seed, expected exactly one");
    Require(sawSwapIn == threads - 1u, std::string(what) + ": " + std::to_string(sawSwapIn) + " lanes saw the swap-in, expected " + std::to_string(threads - 1u));
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
        RunAdd(*device, 32u, 32u);
        CheckAdd(32u, "wave32");
        RunAdd(*device, 64u, 64u);
        CheckAdd(64u, "wave64");
        RunMin(*device);
        CheckMin(32u, "min");
        RunSwap(*device, 32u, 32u);
        CheckSwap(32u, "swap wave32");
        RunSwap(*device, 64u, 64u);
        CheckSwap(64u, "swap wave64");
        std::puts("gds 64-bit atomic tests passed");
        return 0;
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
