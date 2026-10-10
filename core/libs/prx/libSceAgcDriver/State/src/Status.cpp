#include "prx/libSceAgcDriver/State/include/Status.hpp"

#include "prx/libSceAgcDriver/Execution/include/CaptureTrace.hpp"

#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

extern "C" {

bool APS5_VABI sceAgcDriverIsCaptureInProgress(void) {
    return AgcDriver::CaptureTrace::InProgress();
}

bool APS5_VABI sceAgcDriverIsTraceInProgress(void) {
    return AgcDriver::CaptureTrace::InProgress();
}

bool APS5_VABI sceAgcDriverIsSubmitValidationEnabled(void) {
    return false;
}

int APS5_VABI sceAgcDriverRequestCaptureStart(const char* path) {
    if (path == nullptr || !*path) throw std::invalid_argument(std::string(__func__) + ": null path");
    AgcDriver::CaptureTrace::Start(path);
    return 0;
}

int APS5_VABI sceAgcDriverRequestCaptureStop() {
    AgcDriver::CaptureTrace::Stop();
    return 0;
}

int APS5_VABI sceAgcDriverTriggerCapture() {

    return 0;
}

}
