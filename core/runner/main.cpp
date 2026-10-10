#include <Runner.hpp>
#include <filesystem>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

Runner::Options ParseOptions(int argc, char* argv[]) {
    Runner::Options options;
    std::vector<std::string> positional;
    for (int index = 1; index < argc; ++index) {
        const std::string argument = argv[index];
        if (argument == "--windows") {
            options.toWindows = true;
        } else if (argument == "--to-intel") {
            options.toIntel = true;
        } else if (argument == "--libs") {
            if (index + 1 >= argc) throw std::invalid_argument("--libs requires a directory argument");
            options.libs = argv[++index];
        } else if (!argument.empty() && argument.front() == '-') {
            throw std::invalid_argument("unknown option: " + argument);
        } else {
            positional.push_back(argument);
        }
    }
    if (positional.empty()) throw std::invalid_argument("usage: leonps5 [--windows] [--to-intel] [--libs <dir>] <game-directory-or-elf> [output-directory]");
    if (positional.size() > 2) throw std::invalid_argument("usage: leonps5 [--windows] [--to-intel] [--libs <dir>] <game-directory-or-elf> [output-directory]");
    options.input = positional[0];
    if (positional.size() > 1) options.output = positional[1];
    return options;
}

}

int main(const int argc, char* argv[]) {
    Runner::Options options;
    try {
        options = ParseOptions(argc, argv);
    } catch (const std::exception& e) {
        std::cerr << "FAIL: " << e.what() << "\n";
        return 1;
    }
    options.exeDirectory = std::filesystem::absolute(argv[0]).parent_path().string();
    return Runner::Run(options);
}
