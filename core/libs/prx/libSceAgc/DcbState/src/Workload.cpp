#include "prx/libSceAgc/DcbState/include/Workload.hpp"

#include "prx/libSceAgc/Command/include/Packet.hpp"
#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

extern "C" {

uint32_t* APS5_VABI sceAgcDcbSetWorkloadComplete(CommandBuffer* buf, uint32_t stream_id, uint32_t workload_id) {
 (void)buf;
 (void)stream_id;
 (void)workload_id;
    throw std::runtime_error(std::string("sceAgcDcbSetWorkloadComplete") + ": the workload-complete packet layout is unverified, so the call throws instead of emitting a wrong packet");
 return nullptr;
}

uint32_t* APS5_VABI sceAgcDcbSetWorkloadsActive(CommandBuffer* buf, uint32_t stream_id, const uint32_t* workload_ids, uint32_t workload_count) {
 (void)buf;
 (void)stream_id;
 (void)workload_ids;
 (void)workload_count;
    throw std::runtime_error(std::string("sceAgcDcbSetWorkloadsActive") + ": the workload-active packet layout is unverified, so the call throws instead of emitting a wrong packet");
 return nullptr;
}

}
