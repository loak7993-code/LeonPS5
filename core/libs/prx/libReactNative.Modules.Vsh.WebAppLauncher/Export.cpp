#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"

extern "C" {

int APS5_VABI ErrorDialogClose(void) {

 return 0;
}

int APS5_VABI ErrorDialogOpen(const void* param) {
 (void)param;
 return 0;
}

int APS5_VABI ShareGetCurrentStatus(uint32_t feature_flag, ShareCurrentStatus* status) {
 (void)feature_flag;
 if (status == nullptr) throw std::invalid_argument(std::string(__func__) + ": null status");
 *status = ShareCurrentStatus {};
 return 0;
}

int APS5_VABI ShareInitialize(size_t heap_size, int thread_priority, uint64_t affinity_mask) {
 (void)heap_size;
 (void)thread_priority;
 (void)affinity_mask;
 return 0;
}

int APS5_VABI ShareTerminate(void) {

 return 0;
}

int APS5_VABI SystemServiceParamGetInt(int param_id, int* value) {
 if (value == nullptr) throw std::invalid_argument(std::string(__func__) + ": null value");
 *value = 0;
 (void)param_id;
 return 0;
}

int APS5_VABI SystemServiceParamGetString(int param_id, char* buf, size_t buf_size) {
 if (buf == nullptr || buf_size == 0) throw std::invalid_argument(std::string(__func__) + ": null or empty buffer");
 constexpr char SystemName[] = "PS5";
 if (buf_size < sizeof(SystemName)) throw std::runtime_error(std::string(__func__) + ": buffer too short for the system name");
 std::memcpy(buf, SystemName, sizeof(SystemName));
 (void)param_id;
 return 0;
}

}
