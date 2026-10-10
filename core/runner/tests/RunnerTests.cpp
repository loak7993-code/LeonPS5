#include "Runner.hpp"
#include "ElfFixture.hpp"

#include <array>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <stdexcept>
#include <string>
#include <sys/resource.h>
#include <unistd.h>

namespace {

using RelinkerTests::Bytes;
using RelinkerTests::MakeExecutable;

class TempDirectory {
public:
    TempDirectory() {
        auto pattern = (std::filesystem::temp_directory_path() / "anyps5-runner-XXXXXX").string();
        if (mkdtemp(pattern.data()) == nullptr) throw std::runtime_error("Cannot create a temporary directory");
        path = pattern;
    }

    TempDirectory(const TempDirectory&) = delete;
    TempDirectory& operator=(const TempDirectory&) = delete;

    ~TempDirectory() {
        std::error_code error;
        std::filesystem::remove_all(path, error);
    }

    std::filesystem::path path;
};

void Require(bool condition, const std::string& message) {
    if (!condition) {
        std::fprintf(stderr, "Runner: %s\n", message.c_str());
        std::abort();
    }
}

void DisableCoreDumps() {
    rlimit limit {};
    getrlimit(RLIMIT_CORE, &limit);
    limit.rlim_cur = 0;
    setrlimit(RLIMIT_CORE, &limit);
}

void WriteFile(const std::filesystem::path& path, const Bytes& bytes) {
    std::ofstream stream(path, std::ios::binary);
    stream.write(reinterpret_cast<const char*>(bytes.data()), static_cast<std::streamsize>(bytes.size()));
    Require(!stream.fail(), "test fixture write failed");
}

void WriteTextFile(const std::filesystem::path& path, const std::string& content) {
    std::ofstream stream(path, std::ios::binary);
    stream << content;
    Require(!stream.fail(), "test fixture write failed");
}

Runner::Options MakeOptions(const std::filesystem::path& input, const std::filesystem::path& output, const std::filesystem::path& libs) {
    Runner::Options options;
    options.input = input;
    options.output = output;
    options.libs = libs;
    return options;
}

constexpr int kEntryStubSignalExit = 128 + 4;

void RunConvertedGame(const std::filesystem::path& input, const std::filesystem::path& output, const std::filesystem::path& libs, const std::filesystem::path& resourceSource, const std::string& resourceName) {
    const int result = Runner::Run(MakeOptions(input, output, libs));
    Require(result == kEntryStubSignalExit, "the converted game did not run and die on the entry stub: exit " + std::to_string(result));
    const std::filesystem::path app = output / "app.elf";
    Require(std::filesystem::exists(app), "the converted executable is missing");
    const std::filesystem::path copied = output / "libs" / "dummy.prx";
    Require(std::filesystem::exists(copied), "the system library was not copied");
    const std::filesystem::path resource = output / "app0" / resourceName;
    Require(std::filesystem::exists(resource), "the game resource was not copied");
    std::ifstream source(resourceSource, std::ios::binary);
    std::ifstream target(resource, std::ios::binary);
    char sourceByte = '\0';
    char targetByte = '\0';
    source.read(&sourceByte, 1);
    target.read(&targetByte, 1);
    Require(sourceByte == targetByte, "the copied game resource differs from the source");
    Require(!std::filesystem::exists(output / "app0" / "sce_module"), "an empty source module directory was copied into app0");
}

}

int main() {
    try {
        DisableCoreDumps();
        TempDirectory directory;
        const std::filesystem::path libs = directory.path / "libs";
        std::filesystem::create_directories(libs);
        const Bytes dummyLibrary {0x01, 0x02, 0x03, 0x04};
        WriteFile(libs / "dummy.prx", dummyLibrary);

        const std::filesystem::path game = directory.path / "game";
        std::filesystem::create_directories(game / "sce_module");
        const Bytes code {0xC3};
        WriteFile(game / "game.elf", MakeExecutable(code));
        const Bytes resource {0xAA, 0xBB};
        WriteFile(game / "resource.bin", resource);
        RunConvertedGame(game, directory.path / "out", libs, game / "resource.bin", "resource.bin");

        const std::filesystem::path second = directory.path / "second";
        std::filesystem::create_directories(second / "sce_modules");
        WriteFile(second / "image.elf", MakeExecutable(code));
        WriteTextFile(second / "config.txt", "value\n");
        RunConvertedGame(second, directory.path / "out2", libs, second / "config.txt", "config.txt");

        const std::filesystem::path noModules = directory.path / "nomodules";
        std::filesystem::create_directories(noModules);
        WriteFile(noModules / "game.elf", MakeExecutable(code));
        Require(Runner::Run(MakeOptions(noModules, directory.path / "out3", libs)) == 1, "a game without any module directory was accepted");

        const std::filesystem::path both = directory.path / "both";
        std::filesystem::create_directories(both / "sce_module");
        std::filesystem::create_directories(both / "sce_modules");
        WriteFile(both / "game.elf", MakeExecutable(code));
        Require(Runner::Run(MakeOptions(both, directory.path / "out4", libs)) == 1, "a game with both module directories was accepted");

        const std::filesystem::path ambiguous = directory.path / "ambiguous";
        std::filesystem::create_directories(ambiguous / "sce_module");
        WriteFile(ambiguous / "a.elf", MakeExecutable(code));
        WriteFile(ambiguous / "b.elf", MakeExecutable(code));
        Require(Runner::Run(MakeOptions(ambiguous, directory.path / "out5", libs)) == 1, "a game with two ELF files was accepted");

        const std::filesystem::path missingLibs = directory.path / "missing-libs";
        Require(Runner::Run(MakeOptions(game, directory.path / "out6", directory.path / "nowhere")) == 1, "a missing system library directory was accepted");

        const int noLibsResult = Runner::Run(MakeOptions(game, directory.path / "out7", std::filesystem::path()));
        Require(noLibsResult == 1, "a missing system library directory was accepted without --libs");

        std::puts("Runner tests passed");
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "Runner: %s\n", error.what());
        return 1;
    }
}
