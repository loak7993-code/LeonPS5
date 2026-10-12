#include "RdnaDecoder/RdnaInstructionDecoder.hpp"
#include "Recompiler.hpp"
#include "BdaAbi.hpp"
#include <spirv/unified1/spirv.hpp>
#include <array>
#include <algorithm>
#include <cstdio>
#include <exception>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

using namespace ShaderRecompiler;

void Check(bool condition, const std::string& message) {
    if (!condition) throw std::runtime_error(message);
}

std::array<std::uint32_t, 4> BufferDescriptor(const void* data, std::uint32_t bytes) {
    const auto address = reinterpret_cast<std::uintptr_t>(data);
    return {static_cast<std::uint32_t>(address), static_cast<std::uint32_t>((address >> 32u) & 0xffffu), bytes, 0x31016facu};
}

SpirvTarget SweepTarget() {
    static constexpr std::array<std::uint32_t, 4> capabilities{
        spv::CapabilityInt64, spv::CapabilityInt64Atomics, spv::CapabilityPhysicalStorageBufferAddresses,
        spv::CapabilityStorageBuffer8BitAccess,
    };
    static constexpr std::array<std::string_view, 5> extensions{
        "SPV_EXT_descriptor_indexing", "SPV_KHR_8bit_storage", "SPV_KHR_float_controls",
        "SPV_KHR_physical_storage_buffer", "SPV_KHR_shader_atomic_int64",
    };
    return {0x00401000u, 0x00010300u, 64, BdaAbi::Version, capabilities, extensions, false,
            {1024, 1024, 64}, 1024, 32768, {}, {}};
}

constexpr std::uint32_t DsWord(std::uint32_t opcode, std::uint32_t combinedOffset) {
    return (0x36u << 26u) | (opcode << 18u) | (1u << 17u) | combinedOffset;
}

std::vector<std::uint32_t> SetFromText(const char* text) {
    std::vector<std::uint32_t> opcodes;
    std::string word;
    for (const char* cursor = text; ; ++cursor) {
        if (*cursor == ' ' || *cursor == '\0') {
            if (!word.empty()) {
                opcodes.push_back(static_cast<std::uint32_t>(std::stoul(word, nullptr, 16)));
                word.clear();
            }
            if (*cursor == '\0') break;
            continue;
        }
        word += *cursor;
    }
    return opcodes;
}

// The classification is pinned from the decoder's DS opcode table: these sets are the whole
// 8-bit DS opcode space with the GDS bit set.
const char* CompilingOpcodes =
    "00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f 10 11 12 13 14 15 1e 1f 20 21 22 23 24 25 26 27 28 29 2a 2b 2c 2d 2e 2f 30 31 32 33 34 36 37 38 39 3a 3b 3c 3d 3e "
    "40 41 42 43 44 45 46 47 48 49 4a 4b 4c 4d 4e 4f 50 51 52 53 55 60 61 62 63 64 65 66 67 68 69 6a 6b 6c 6d 6e 6f 70 71 72 73 76 77 78 7e "
    "80 81 82 83 84 85 86 87 88 89 8a 8b 8d 92 93 95 a0 a1 a2 a3 a4 a5 a6 a7 de df fe ff";
const char* UnknownOpcodes =
    "16 17 54 56 57 58 59 5a 5b 5c 5d 5e 5f 74 75 79 7a 7b 7c 7d 7f 8c 8e 8f 90 91 94 96 97 98 99 9a 9b 9c 9d 9e 9f a8 a9 aa ab ac ad ae af "
    "b4 b5 b6 b7 b8 b9 ba bb bc bd be bf c0 c1 c2 c3 c4 c5 c6 c7 c8 c9 ca cb cc cd ce cf d0 d1 d2 d3 d4 d5 d6 d7 d8 d9 da db dc dd "
    "e0 e1 e2 e3 e4 e5 e6 e7 e8 e9 ea eb ec ed ee ef f0 f1 f2 f3 f4 f5 f6 f7 f8 f9 fa fb fc fd";
const char* LaneOnlyOpcodes = "35 b0 b1 b2 b3";
const char* WaveSyncOpcodes = "18 19 1a 1b 1c 1d";
const char* OrderedCountOpcodes = "3f";

enum class Verdict { Compile, Lane, WaveSync, Ordered, Unknown, Other };

Verdict Run(std::uint32_t dsOpcode, std::string& detail) {
    const std::array<std::uint32_t, 4> code{
        0x7e0002c0u,
        DsWord(dsOpcode, (0x20u << 8u) | 0x10u),
        (4u << 24u) | (6u << 16u) | (2u << 8u) | 0u,
        0xbf810000u,
    };
    const std::span<const std::uint32_t> words(code);
    try {
        (void)RdnaInstructionDecoder{}.Decode(words);
    } catch (const std::exception& error) {
        detail = error.what();
        if (detail.find("DS opcode is not supported") != std::string::npos) return Verdict::Unknown;
        if (detail.find("DS lane operation is available only for LDS") != std::string::npos) return Verdict::Lane;
        return Verdict::Other;
    }
    alignas(256) std::array<std::uint32_t, 16> output{};
    const std::array<MemoryRegion, 1> memory{{{reinterpret_cast<std::uintptr_t>(code.data()), std::as_bytes(words)}}};
    const std::array<std::uint32_t, 4> userData{BufferDescriptor(output.data(), static_cast<std::uint32_t>(output.size() * 4u))};
    const ShaderComputeStageInfo compute{{8u, 1u, 1u}, 1024u, {false, false, false}, false, 1};
    RecompileRequest request{
        {ShaderStage::Compute, reinterpret_cast<std::uintptr_t>(code.data()), words, 0, {}},
        {32u, 0, userData, compute, std::nullopt, std::nullopt, memory},
        SweepTarget(), {0, 0, 0, 128}, std::nullopt, false,
    };
    try {
        (void)Recompile(request);
        return Verdict::Compile;
    } catch (const std::exception& error) {
        detail = error.what();
        if (detail.find("global wave sync barriers and semaphores") != std::string::npos) return Verdict::WaveSync;
        if (detail.find("GDS counters updated in wave launch order") != std::string::npos) return Verdict::Ordered;
        return Verdict::Other;
    }
}

std::string Hex(std::uint32_t opcode) {
    char text[8];
    std::snprintf(text, sizeof(text), "%02x", opcode);
    return text;
}

void CheckBucket(const char* name, const char* text, Verdict expected) {
    const auto opcodes = SetFromText(text);
    for (const auto opcode : opcodes) {
        std::string detail;
        const auto verdict = Run(opcode, detail);
        Check(verdict == expected, std::string(name) + " opcode " + Hex(opcode) + " classified " + detail);
    }
}

}

int main() {
    try {
        CheckBucket("compiling", CompilingOpcodes, Verdict::Compile);
        CheckBucket("unknown", UnknownOpcodes, Verdict::Unknown);
        CheckBucket("lane-only", LaneOnlyOpcodes, Verdict::Lane);
        CheckBucket("wave-sync", WaveSyncOpcodes, Verdict::WaveSync);
        CheckBucket("ordered-count", OrderedCountOpcodes, Verdict::Ordered);
        std::vector<std::uint32_t> pinned;
        for (const auto* text : {CompilingOpcodes, UnknownOpcodes, LaneOnlyOpcodes, WaveSyncOpcodes, OrderedCountOpcodes}) {
            auto set = SetFromText(text);
            pinned.insert(pinned.end(), set.begin(), set.end());
        }
        std::sort(pinned.begin(), pinned.end());
        Check(pinned.size() == 256u, "the pinned DS opcode classification covers " + std::to_string(pinned.size()) + " opcodes, not 256");
        for (std::uint32_t index = 0u; index < 256u; ++index) {
            Check(pinned[index] == index, "the pinned DS opcode classification has a gap or duplicate at " + Hex(index));
        }
        std::puts("ds gds sweep passed");
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "%s\n", error.what());
        return 1;
    }
}
