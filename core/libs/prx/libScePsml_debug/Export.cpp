#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

namespace {

constexpr std::int32_t SCE_PSML_ERROR_NOT_INITIALIZED = static_cast<std::int32_t>(0x8A810001);

}

extern "C" {

std::int32_t APS5_VABI scePsmlMfsrGetContextBufferRequirement1100(void* requirement, const void* param) {
 (void)requirement;
 (void)param;
 return SCE_PSML_ERROR_NOT_INITIALIZED;
}

std::int32_t APS5_VABI scePsmlMfsrCreateContext1100(void** context, const void* param) {
 (void)context;
 (void)param;
 return SCE_PSML_ERROR_NOT_INITIALIZED;
}

std::int32_t APS5_VABI scePsmlMfsrGetDispatchMfsrPacket1100(void* context, void* commandBuffer, const void* param) {
 (void)context;
 (void)commandBuffer;
 (void)param;
 return SCE_PSML_ERROR_NOT_INITIALIZED;
}

int APS5_VABI scePsmlMfsrGetSharedResourcesInitRequirement() {

 return 0;
}

int APS5_VABI scePsmlMfsrInit() {

 return 0;
}

int APS5_VABI scePsmlMfsrGetDispatchMfsrPacketSizeInDwords() {

 return 0;
}

int APS5_VABI scePsmlMfsrGetContextBufferRequirement800M3_2() {

 return 0;
}

int APS5_VABI scePsmlMfsrSelectConfig() {

 return 0;
}

int APS5_VABI scePsmlMfsrGetMipmapBias() {

 return 0;
}

int APS5_VABI scePsmlMfsrRequestCapture() {

 return 0;
}

int APS5_VABI scePsmlMfsrReleaseContext() {

 return 0;
}

int APS5_VABI scePsmlMfsrIsCaptureInProgress() {

 return 0;
}

int APS5_VABI scePsmlMfsrGetDispatchMfsrPacket1000() {

 return 0;
}

int APS5_VABI scePsmlMfsrGetDispatchMfsrPacket900() {

 return 0;
}

int APS5_VABI scePsmlMfsrCreateSharedResources() {

 return 0;
}

int APS5_VABI scePsmlMfsrCreateContext800M3_2() {

 return 0;
}

int APS5_VABI scePsmlMfsrReleaseSharedResources() {

 return 0;
}

int APS5_VABI scePsmlMfsr2ReleaseSharedResources() {

    return 0;
}

int APS5_VABI scePsmlMfsr2GetSharedResourcesInitRequirement() {

    return 0;
}

int APS5_VABI scePsmlMfsr2GetContextInitRequirement() {

    return 0;
}

int APS5_VABI scePsmlMfsr2ReleaseContext() {

    return 0;
}

int APS5_VABI scePsmlMfsr2GetDispatchPacketsSizeInDwords() {

    return 0;
}

int APS5_VABI scePsmlMfsr2CreateSharedResources() {

    return 0;
}

int APS5_VABI scePsmlMfsr2GetDispatchPackets() {

    return 0;
}

int APS5_VABI scePsmlMfsr2CreateContext() {

    return 0;
}

int APS5_VABI scePsmlMfsr2Init() {

    return 0;
}

}
