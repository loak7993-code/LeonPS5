#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

namespace {

constexpr std::int32_t SCE_HMD2_ERROR_UNSUPPORTED_FEATURE = static_cast<std::int32_t>(0x81110016);

}

extern "C" {

std::int32_t APS5_VABI sceHmd2Initialize(const void* param) {
    (void)param;
    return SCE_HMD2_ERROR_UNSUPPORTED_FEATURE;
}

int APS5_VABI sceHmd2Close() {
    throw std::runtime_error(std::string("sceHmd2Close") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2GazeGetResultForFoveatedRendering() {
    throw std::runtime_error(std::string("sceHmd2GazeGetResultForFoveatedRendering") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2GetDeviceInformation() {
    throw std::runtime_error(std::string("sceHmd2GetDeviceInformation") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2GetFieldOfViewWithoutHandle() {
    throw std::runtime_error(std::string("sceHmd2GetFieldOfViewWithoutHandle") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2Open() {
    throw std::runtime_error(std::string("sceHmd2Open") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2ReprojectionBeginFrame() {
    throw std::runtime_error(std::string("sceHmd2ReprojectionBeginFrame") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2ReprojectionDisableVrMode() {
    throw std::runtime_error(std::string("sceHmd2ReprojectionDisableVrMode") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2ReprojectionEnableVrMode() {
    throw std::runtime_error(std::string("sceHmd2ReprojectionEnableVrMode") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2ReprojectionGetPredictedDisplayTime() {
    throw std::runtime_error(std::string("sceHmd2ReprojectionGetPredictedDisplayTime") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2ReprojectionInitialize() {
    throw std::runtime_error(std::string("sceHmd2ReprojectionInitialize") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2ReprojectionQueryBufferSizeAlign() {
    throw std::runtime_error(std::string("sceHmd2ReprojectionQueryBufferSizeAlign") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2ReprojectionQueryDisplayBufferSizeAlign() {
    throw std::runtime_error(std::string("sceHmd2ReprojectionQueryDisplayBufferSizeAlign") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2ReprojectionSetAllowPositionalReprojection() {
    throw std::runtime_error(std::string("sceHmd2ReprojectionSetAllowPositionalReprojection") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2ReprojectionSetParamWithBuffer() {
    throw std::runtime_error(std::string("sceHmd2ReprojectionSetParamWithBuffer") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2ReprojectionSetRenderConfig() {
    throw std::runtime_error(std::string("sceHmd2ReprojectionSetRenderConfig") + " not implemented");
    return 0;

}

int APS5_VABI sceHmd2SetVibration() {
    throw std::runtime_error(std::string("sceHmd2SetVibration") + " not implemented");
    return 0;

}

}
