#include "prx/libc/include/general/VabiMacros.hpp"
#include <algorithm>
#include <array>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <stdexcept>

extern "C" {
std::int32_t APS5_VABI sceZlibInitialize(const void*, std::uint64_t);
std::int32_t APS5_VABI sceZlibFinalize();
std::int32_t APS5_VABI sceZlibInflate(const void*, std::uint32_t, void*, std::uint32_t, std::uint64_t*);
std::int32_t APS5_VABI sceZlibWaitForDone(std::uint64_t*, std::uint32_t*);
std::int32_t APS5_VABI sceZlibGetResult(std::uint64_t, std::uint32_t*, std::int32_t*);
}

static void Require(bool value) { if (!value) std::abort(); }

template<typename TAction>
static void RequireThrows(TAction action) {
    try { action(); } catch (const std::runtime_error&) { return; }
    std::abort();
}

int main() {
    constexpr std::array<std::uint8_t, 77> compressed{0x78, 0x9C, 0xED, 0xCA, 0xB1, 0x09, 0xC0, 0x20, 0x10, 0x40, 0xD1, 0x3E,
    0x53, 0xDC, 0x04, 0xE9, 0xB2, 0x85, 0x85, 0xE0, 0x04, 0xB9, 0x53, 0x88,
    0x98, 0x9C, 0x85, 0xD8, 0x38, 0xBD, 0x73, 0x04, 0xFE, 0xAB, 0x5F, 0x28,
    0xDD, 0x63, 0xBA, 0x64, 0xBD, 0x55, 0xC5, 0x9E, 0x62, 0x6D, 0xCC, 0x4F,
    0x6E, 0xCF, 0xA2, 0x7D, 0x7A, 0x1E, 0xE7, 0x11, 0x18, 0x0C, 0x06, 0x83,
    0xC1, 0x60, 0x30, 0x18, 0x0C, 0x06, 0x83, 0xC1, 0x60, 0x30, 0x7E, 0x3D,
    0x36, 0x67, 0x71, 0xF0, 0x4C};
    constexpr char text[] = "LeonPS5 zlib checksum and bounds.\n";
    constexpr std::uint32_t expectedLength = (sizeof(text) - 1) * 128;
    alignas(2048) std::array<std::uint8_t, 2048 + 65536 + 2048> storage{};
    auto* output = storage.data() + 2048;
    std::uint64_t id = 0;
    std::uint32_t produced = 0;
    std::int32_t status = 0;
    Require(sceZlibFinalize() == static_cast<std::int32_t>(0x81120032));
    Require(sceZlibInflate(nullptr, 0, nullptr, 0, nullptr) == static_cast<std::int32_t>(0x81120032));
    RequireThrows([&] { sceZlibInitialize(nullptr, 1); });
    Require(sceZlibInitialize(nullptr, 0) == 0);
    Require(sceZlibInitialize(nullptr, 0) == static_cast<std::int32_t>(0x81120033));
    RequireThrows([&] { sceZlibInflate(compressed.data(), compressed.size(), output + 1, expectedLength, &id); });
    RequireThrows([&] { sceZlibInflate(compressed.data(), compressed.size(), output, 65537, &id); });
    RequireThrows([&] { sceZlibInflate(nullptr, compressed.size(), output, expectedLength, &id); });
    std::uint64_t previous = 0;
    auto decode = [&](const void* input, std::uint32_t inputLength, std::uint32_t capacity, std::int32_t expectedStatus) {
        storage.fill(0xA5);
        Require(sceZlibInflate(input, inputLength, output, capacity, &id) == 0);
        Require(id > previous);
        previous = id;
        RequireThrows([&] { sceZlibInflate(input, inputLength, output, capacity, &id); });
        RequireThrows([&] { sceZlibFinalize(); });
        std::uint32_t timeout = 0;
        RequireThrows([&] { sceZlibWaitForDone(&id, &timeout); });
        std::uint64_t completed;
        Require(sceZlibWaitForDone(&completed, nullptr) == 0);
        Require(completed == id);
        RequireThrows([&] { sceZlibGetResult(id + 1, &produced, &status); });
        Require(sceZlibGetResult(id, &produced, &status) == 0);
        Require(status == expectedStatus && produced <= capacity);
        RequireThrows([&] { sceZlibGetResult(id, &produced, &status); });
        Require(std::all_of(storage.begin(), storage.begin() + 2048, [](auto byte) { return byte == 0xA5; }));
        Require(std::all_of(storage.begin() + 2048 + capacity, storage.end(), [](auto byte) { return byte == 0xA5; }));
    };
    decode(compressed.data(), compressed.size(), expectedLength, 0);
    Require(produced == expectedLength);
    for (std::uint32_t offset = 0; offset < produced; offset += sizeof(text) - 1)
        Require(std::memcmp(output + offset, text, sizeof(text) - 1) == 0);
    decode(compressed.data(), compressed.size(), expectedLength - 1, static_cast<std::int32_t>(0x8112001C));
    auto corrupt = compressed;
    corrupt.back() ^= 1;
    decode(corrupt.data(), corrupt.size(), expectedLength, static_cast<std::int32_t>(0x811200FF));
    decode(compressed.data(), compressed.size() - 1, 65536, static_cast<std::int32_t>(0x811200FF));
    Require(sceZlibFinalize() == 0);
    Require(sceZlibGetResult(id, &produced, &status) == static_cast<std::int32_t>(0x81120032));
    std::array<std::uint8_t, 65536> scratch{};
    Require(sceZlibInitialize(scratch.data(), scratch.size()) == 0);
    decode(compressed.data(), compressed.size(), 65536, 0);
    Require(sceZlibFinalize() == 0);
}
