#include "BdaAbi.hpp"
#include "Recompiler.hpp"
#include <algorithm>
#include <array>
#include <cstdio>
#include <exception>
#include <span>
#include <spirv/unified1/spirv.hpp>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

using namespace ShaderRecompiler;

void Check(bool condition, const std::string& message) {
    if (!condition) throw std::runtime_error(message);
}

SpirvTarget StorageOnlyTarget() {
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

constexpr std::uint32_t DsRegisters(std::uint32_t vdst, std::uint32_t data1, std::uint32_t data0, std::uint32_t addr) {
    return (vdst << 24u) | (data1 << 16u) | (data0 << 8u) | addr;
}

constexpr std::array<std::uint32_t, 11> Code{
    DsWord(0x60u, 0x40u), DsRegisters(4u, 2u, 1u, 0u),
    DsWord(0x27u, 0x80u), DsRegisters(6u, 0u, 3u, 0u),
    DsWord(0x70u, 0xc0u), DsRegisters(8u, 5u, 3u, 0u),
    DsWord(0x7eu, 0x100u), DsRegisters(10u, 8u, 3u, 0u),
    DsWord(0x87u, 0x40u), DsRegisters(12u, 0u, 0u, 0u),
    0xbf810000u,
};

RecompileResult Compile(std::uint32_t waveSize) {
    const std::span<const std::uint32_t> code(Code);
    const std::array<MemoryRegion, 1> memory{{{reinterpret_cast<std::uintptr_t>(Code.data()), std::as_bytes(code)}}};
    const std::array<std::uint32_t, 2> userData{0x10000u, 0u};
    const ShaderComputeStageInfo compute{{8u, 1u, 1u}, 0, {false, false, false}, false, 1, {}};
    RecompileRequest request{
        {ShaderStage::Compute, reinterpret_cast<std::uintptr_t>(Code.data()), code, 0, {}},
        {waveSize, 0, userData, compute, std::nullopt, std::nullopt, memory},
        StorageOnlyTarget(), {0, 0, 0, 128}, std::nullopt, false,
    };
    return Recompile(request);
}

struct ModuleFacts {
    bool int64AtomicsCapability = false;
    bool aliasedGds = false;
    std::size_t atomic64 = 0;
    std::size_t atomicCompareExchange64 = 0;
    std::size_t atomic32 = 0;
    std::uint32_t gdsId = 0;
};

ModuleFacts Inspect(const RecompileResult& result) {
    const auto& words = result.spirv.Words();
    Check(words.size() >= 5 && words[0] == spv::MagicNumber, "the GDS fixture is missing the SPIR-V module");
    ModuleFacts facts;
    std::vector<std::uint32_t> u64Types;
    std::vector<std::pair<std::uint32_t, std::string>> names;
    auto is64 = [&](std::uint32_t type) { return std::find(u64Types.begin(), u64Types.end(), type) != u64Types.end(); };
    for (std::size_t offset = 5; offset < words.size();) {
        const auto count = words[offset] >> spv::WordCountShift;
        const auto opcode = words[offset] & spv::OpCodeMask;
        Check(count != 0 && count <= words.size() - offset, "the GDS fixture produced a malformed SPIR-V instruction");
        if (opcode == spv::OpCapability) {
            facts.int64AtomicsCapability = facts.int64AtomicsCapability || words[offset + 1u] == spv::CapabilityInt64Atomics;
        } else if (opcode == spv::OpTypeInt && count == 4u && words[offset + 1u] != 0u && words[offset + 2u] == 64u) {
            u64Types.push_back(words[offset + 1u]);
        } else if (opcode == spv::OpName) {
            names.emplace_back(words[offset + 1u], std::string(reinterpret_cast<const char*>(&words[offset + 2u])));
        } else if (opcode == spv::OpAtomicCompareExchange) {
            facts.atomicCompareExchange64 += is64(words[offset + 1u]) ? 1u : 0u;
        } else if (opcode == spv::OpAtomicIAdd || opcode == spv::OpAtomicISub || opcode == spv::OpAtomicSMin || opcode == spv::OpAtomicUMin || opcode == spv::OpAtomicSMax || opcode == spv::OpAtomicUMax || opcode == spv::OpAtomicAnd || opcode == spv::OpAtomicOr || opcode == spv::OpAtomicXor || opcode == spv::OpAtomicExchange) {
            if (is64(words[offset + 1u])) ++facts.atomic64;
            else ++facts.atomic32;
        }
        offset += count;
    }
    for (const auto& [id, name] : names) {
        if (name == "gds") facts.gdsId = id;
    }
    Check(facts.gdsId != 0u, "the GDS fixture has no gds variable");
    for (std::size_t offset = 5; offset < words.size();) {
        const auto count = words[offset] >> spv::WordCountShift;
        const auto opcode = words[offset] & spv::OpCodeMask;
        if (opcode == spv::OpDecorate && count == 3u && words[offset + 1u] == facts.gdsId && words[offset + 2u] == spv::DecorationAliased) {
            facts.aliasedGds = true;
        }
        offset += count;
    }
    return facts;
}

}

int main() {
    try {
        const auto wave32 = Inspect(Compile(32));
        Check(wave32.int64AtomicsCapability, "the 64-bit GDS fixture did not declare the 64-bit atomic capability");
        Check(wave32.aliasedGds, "the gds variable is not aliased for the 64-bit view");
        Check(wave32.atomic64 >= 1u, "the 64-bit GDS add did not emit a native 64-bit atomic (a64=" + std::to_string(wave32.atomic64) + ", a32=" + std::to_string(wave32.atomic32) + ", cx64=" + std::to_string(wave32.atomicCompareExchange64) + ")");
        Check(wave32.atomicCompareExchange64 >= 1u, "the 64-bit GDS compare exchange did not emit a 64-bit compare exchange");
        Check(wave32.atomic32 >= 1u, "the 32-bit GDS min emitted no atomic");
        const auto wave64 = Inspect(Compile(64));
        Check(wave64.int64AtomicsCapability && wave64.aliasedGds && wave64.atomic64 >= 1u && wave64.atomicCompareExchange64 >= 1u && wave64.atomic32 >= 2u, "wave64 lost the GDS atomics");
        std::puts("gds shader compilation passed");
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "%s\n", error.what());
        return 1;
    }
}
