#pragma once

#include <filesystem>

namespace Runner {

struct Options {
    std::filesystem::path input;
    std::filesystem::path output;
    std::filesystem::path libs;
    std::filesystem::path exeDirectory;
    bool toWindows = false;
    bool toMacos = false;
    bool toIntel = false;
};

int Run(const Options& options);

}
