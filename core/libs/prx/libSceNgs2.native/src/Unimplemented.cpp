#include <cstddef>
#include <cstdint>

#include "prx/libc/include/General.hpp"
#include "prx/libSceNgs2.native/include/Ngs2Types.hpp"

#pragma GCC visibility push(default)

extern "C" {

int APS5_VABI sceNgs2GeomApply(const Ngs2GeomListenerWork* listener, const Ngs2GeomSourceParam* source, Ngs2GeomAttribute* out_attrib, uint32_t flags) {
    (void)listener;
    (void)source;
    (void)out_attrib;
    (void)flags;
    throw std::runtime_error(std::string(__func__) + ": geometric occlusion is not modeled");
}

int APS5_VABI sceNgs2GeomCalcListener(const Ngs2GeomListenerParam* param, Ngs2GeomListenerWork* out_work, uint32_t flags) {
    (void)param;
    (void)out_work;
    (void)flags;
    throw std::runtime_error(std::string(__func__) + ": geometric occlusion is not modeled");
}

int APS5_VABI sceNgs2GeomResetListenerParam(Ngs2GeomListenerParam* out_listener_param) {
    if (out_listener_param == nullptr) throw std::invalid_argument(std::string(__func__) + ": null out param");
    *out_listener_param = Ngs2GeomListenerParam {};
    return 0;
}

int APS5_VABI sceNgs2GeomResetSourceParam(Ngs2GeomSourceParam* out_source_param) {
    if (out_source_param == nullptr) throw std::invalid_argument(std::string(__func__) + ": null out param");
    *out_source_param = Ngs2GeomSourceParam {};
    return 0;
}

}

#pragma GCC visibility pop
