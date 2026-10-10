#include <cstdint>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

extern "C" {

int APS5_VABI sceAudioOut2MasteringInit(uint32_t flags) {
    if (flags != 0) throw std::runtime_error(std::string(__func__) + ": flags other than zero are not supported");
    return 0;
}

int APS5_VABI sceAudioOut2MasteringTerm(void) {
    return 0;
}

int APS5_VABI sceAudioOut2MasteringGetState(AudioOut2MasteringStatesHeader* state, uint32_t output, AudioOut2UserHandle user) {
    (void)output;
    (void)user;
    if (state == nullptr) throw std::runtime_error(std::string(__func__) + " not implemented");
    *state = AudioOut2MasteringStatesHeader {};
    return 0;
}

int APS5_VABI sceAudioOut2MasteringSetParam(const AudioOut2MasteringParamsHeader* param, uint32_t output, uint32_t flags) {
    (void)output;
    (void)flags;
    if (param == nullptr) throw std::runtime_error(std::string(__func__) + " not implemented");
    return 0;
}

}
