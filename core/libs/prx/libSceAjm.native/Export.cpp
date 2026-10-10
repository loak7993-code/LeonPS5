#include <cstdint>
#include <cstddef>
#include "SceTypes.hpp"
#include "prx/libc/include/General.hpp"
#include <atomic>
#include <cstdio>

// Entry points this library does not implement: reported before the unimplemented-call exception so an
// APS5_TRACE_AJM run shows which one a title reached.
extern "C" {

int APS5_VABI sceAjmBatchJobDecodeSplit(AjmBatchInfo* info, uint32_t instance, const AjmBuffer* input_buffers, size_t input_buffers_num, const AjmBuffer* output_buffers, size_t output_buffers_num, void* result) {
 (void)info;
 (void)instance;
 (void)input_buffers;
 (void)input_buffers_num;
 (void)output_buffers;
 (void)output_buffers_num;
 (void)result;
 throw std::runtime_error(std::string(__func__) + ": split-input decode batches are not supported by the Ajm engine port");
}

int APS5_VABI sceAjmBatchJobEncode(AjmBatchInfo* info, uint32_t instance, const void* pcm_input, size_t pcm_input_size, void* bitstream_output, size_t bitstream_output_size, void* result) {
 (void)info;
 (void)instance;
 (void)pcm_input;
 (void)pcm_input_size;
 (void)bitstream_output;
 (void)bitstream_output_size;
 (void)result;
 throw std::runtime_error(std::string(__func__) + ": Ajm encoding jobs are not supported by the engine port");
}

int APS5_VABI sceAjmBatchJobSetResampleParametersEx(AjmBatchInfo* info, uint32_t instance, float ratio_start, float ratio_change_per_sample, uint32_t flags, void* result) {
 (void)info;
 (void)instance;
 (void)ratio_start;
 (void)ratio_change_per_sample;
 (void)flags;
 (void)result;
 throw std::runtime_error(std::string(__func__) + ": extended resample parameters are not supported by the Ajm engine port");
}

const char* APS5_VABI sceAjmStrError(int error) {
 (void)error;
 return nullptr;
}

int APS5_VABI sceAjmDecWVorbisCreateHeaderPacket(void) {

    return 0;
}

int APS5_VABI sceAjmDecWVorbisCreateSetupPacket(void) {

    return 0;
}

}
