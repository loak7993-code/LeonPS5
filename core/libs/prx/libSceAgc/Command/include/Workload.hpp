#ifndef CORE_LIBS_PRX_LIBSCEAGC_COMMAND_INCLUDE_WORKLOAD_HPP
#define CORE_LIBS_PRX_LIBSCEAGC_COMMAND_INCLUDE_WORKLOAD_HPP

#include <cstdint>

namespace Agc::Workload {

void ResetAmmSemaphoreMemory();
void SetAmmSemaphoreMemory(void* memory, std::uint64_t size_in_bytes, const char* function);
std::uint64_t GetSemaphoreLabelAddress(std::uint32_t index, const char* function);
std::uint64_t GetStreamSlotAddress(std::uint32_t stream_id, const char* function);

}

#endif
