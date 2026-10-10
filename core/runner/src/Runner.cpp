#include <Runner.hpp>
#include <Convert.hpp>
#include <domain/Types.hpp>
#include <codegen/CodegenException.hpp>
#include <array>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

namespace Runner {

namespace {

struct Input {
    std::filesystem::path executable;
    std::filesystem::path directory;
};

bool IsElf(const std::filesystem::path& path) {
    std::ifstream stream(path, std::ios::binary);
    std::array<char, 4> magic {};
    stream.read(magic.data(), static_cast<std::streamsize>(magic.size()));
    return stream.gcount() == 4 && magic[0] == '\x7F' && magic[1] == 'E' && magic[2] == 'L' && magic[3] == 'F';
}

Input ResolveInput(const std::filesystem::path& input) {
    std::error_code error;
    if (!std::filesystem::exists(input, error)) throw std::invalid_argument("input does not exist: " + input.string());
    if (std::filesystem::is_regular_file(input, error)) {
        if (!IsElf(input)) throw std::invalid_argument("input is not an ELF executable: " + input.string());
        return {input, input.parent_path()};
    }
    if (!std::filesystem::is_directory(input, error)) throw std::invalid_argument("input is neither a file nor a directory: " + input.string());
    std::vector<std::filesystem::path> candidates;
    for (const auto& entry : std::filesystem::directory_iterator(input)) {
        if (entry.is_regular_file() && IsElf(entry.path())) candidates.push_back(entry.path());
    }
    if (candidates.empty()) throw std::invalid_argument("no ELF executable found in " + input.string());
    if (candidates.size() > 1) {
        std::string names;
        for (const auto& candidate : candidates) names += "\n    " + candidate.filename().string();
        throw std::invalid_argument("multiple ELF executables found in " + input.string() + ", pass one explicitly:" + names);
    }
    return {candidates.front(), input};
}

std::filesystem::path ResolveModuleDirectory(const std::filesystem::path& directory) {
    const bool sceModule = std::filesystem::is_directory(directory / "sce_module");
    const bool sceModules = std::filesystem::is_directory(directory / "sce_modules");
    const bool prx = std::filesystem::is_directory(directory / "prx");
    if (sceModule && sceModules) throw std::invalid_argument("both sce_module and sce_modules are present in " + directory.string());
    if (!sceModule && !sceModules && !prx) throw std::invalid_argument("no sce_module, sce_modules or prx directory found in " + directory.string());
    if (sceModule) return directory / "sce_module";
    if (sceModules) return directory / "sce_modules";
    return directory / "prx";
}

std::filesystem::path ResolveLibs(const std::filesystem::path& requested, const std::filesystem::path& exeDirectory) {
    std::vector<std::filesystem::path> candidates;
    if (!requested.empty()) candidates.push_back(requested);
    if (!exeDirectory.empty()) {
        candidates.push_back(exeDirectory / ".." / "libs" / "libs");
        candidates.push_back(exeDirectory / "libs");
    }
    for (const auto& candidate : candidates) {
        std::error_code error;
        if (!std::filesystem::is_directory(candidate, error)) continue;
        for (const auto& entry : std::filesystem::directory_iterator(candidate)) {
            if (entry.is_regular_file() && entry.path().extension() == ".prx") return std::filesystem::weakly_canonical(candidate);
        }
    }
    std::string searched;
    for (const auto& candidate : candidates) searched += "\n    " + candidate.string();
    throw std::invalid_argument("no directory with .prx system libraries found, pass --libs:" + searched);
}

void CopyLibraries(const std::filesystem::path& source, const std::filesystem::path& destination) {
    std::size_t count = 0;
    for (const auto& entry : std::filesystem::directory_iterator(source)) {
        if (entry.is_regular_file() && entry.path().extension() == ".prx") {
            std::filesystem::create_directories(destination);
            std::filesystem::copy_file(entry.path(), destination / entry.path().filename(), std::filesystem::copy_options::overwrite_existing);
            ++count;
        }
    }
    std::cout << "System libraries: " << count << " prx in " << destination.string() << '\n';
}

void CopyResources(const Input& input, const std::filesystem::path& outputDirectory, const std::filesystem::path& app0) {
    std::error_code error;
    const std::filesystem::path inputDirectory = std::filesystem::weakly_canonical(input.directory, error);
    const std::filesystem::path output = std::filesystem::weakly_canonical(outputDirectory, error);
    std::size_t count = 0;
    std::vector<std::filesystem::path> stack {inputDirectory};
    while (!stack.empty()) {
        const std::filesystem::path directory = stack.back();
        stack.pop_back();
        for (const auto& entry : std::filesystem::directory_iterator(directory)) {
            if (entry.is_directory()) {
                const std::filesystem::path canonical = std::filesystem::weakly_canonical(entry.path(), error);
                if (canonical == output) continue;
                const std::string name = entry.path().filename().string();
                if (directory == inputDirectory && (name == "sce_module" || name == "sce_modules" || name == "prx")) continue;
                stack.push_back(entry.path());
                continue;
            }
            if (!entry.is_regular_file()) continue;
            if (entry.path() == input.executable) continue;
            const std::filesystem::path relative = entry.path().lexically_relative(inputDirectory);
            const std::filesystem::path target = app0 / relative;
            std::filesystem::create_directories(target.parent_path());
            std::filesystem::copy_file(entry.path(), target, std::filesystem::copy_options::overwrite_existing);
            ++count;
        }
    }
    std::cout << "Game resources: " << count << " files in " << app0.string() << '\n';
}

int Launch(const std::filesystem::path& executable, bool toWindows) {
    if (!toWindows) {
        std::filesystem::permissions(executable,
            std::filesystem::perms::owner_exec |
            std::filesystem::perms::group_exec |
            std::filesystem::perms::others_exec,
            std::filesystem::perm_options::add);
    }
    std::string command = "\"";
    for (const char character : executable.string()) {
        if (character == '"') command += "\\\"";
        else command += character;
    }
    command += "\"";
#ifdef _WIN32
    const int rawCode = std::system(command.c_str());
    const int exitCode = rawCode;
    std::cout << "Game exit code: " << exitCode << '\n';
    return exitCode;
#else
    const int rawCode = std::system(command.c_str());
    int exitCode = rawCode;
    if (rawCode != -1) {
        const int signal = rawCode & 0x7F;
        exitCode = signal ? 128 + signal : (rawCode >> 8) & 0xFF;
    }
    std::cout << "Game exit code: " << exitCode << '\n';
    return exitCode;
#endif
}

}

int Run(const Options& options) {
    Input input;
    std::filesystem::path outputDirectory;
    std::filesystem::path outputExecutable;
    try {
        input = ResolveInput(options.input);
        ResolveModuleDirectory(input.directory);
        outputDirectory = options.output.empty() ? input.directory / "leonps5-out" : options.output;
        std::filesystem::create_directories(outputDirectory);
        outputExecutable = outputDirectory / (options.toWindows ? "app.exe" : "app.elf");
    } catch (const std::invalid_argument& e) {
        std::cerr << "FAIL: " << e.what() << "\n";
        return 1;
    } catch (const std::exception& e) {
        std::cerr << "FAIL: " << e.what() << "\n";
        return 2;
    }

    Cli::Args args;
    args.inputPath = input.executable.string();
    args.outputPath = outputExecutable.string();
    args.toWindows = options.toWindows;
    args.toIntel = options.toIntel;
    args.runPath = "$ORIGIN/libs";

    int exitCode = 0;
    try {
        exitCode = Cli::Convert(args);
    } catch (const Domain::RelinkerException& e) {
        std::cerr << "FAIL: " << e.what();
        if (e.FailureOffset != 0) std::cerr << " (offset 0x" << std::hex << e.FailureOffset << ")";
        std::cerr << "\n";
        if (!e.InputPath.empty()) std::cerr << "Input: " << e.InputPath << '\n';
        return 2;
    } catch (const Codegen::CodegenException& e) {
        std::cerr << "FAIL: " << e.what();
        if (e.FailureOffset != 0) std::cerr << " (offset 0x" << std::hex << e.FailureOffset << ")";
        std::cerr << "\n";
        return 2;
    } catch (const std::exception& e) {
        std::cerr << "FAIL: " << e.what() << "\n";
        return 2;
    }
    if (exitCode != 0) return exitCode;

    try {
        const std::filesystem::path libs = ResolveLibs(options.libs, options.exeDirectory);
        CopyLibraries(libs, outputDirectory / "libs");
        CopyResources(input, outputDirectory, outputDirectory / "app0");
    } catch (const std::invalid_argument& e) {
        std::cerr << "FAIL: " << e.what() << "\n";
        return 1;
    } catch (const std::exception& e) {
        std::cerr << "FAIL: " << e.what() << "\n";
        return 2;
    }

    if (options.toWindows) {
#ifdef _WIN32
        return Launch(outputExecutable, options.toWindows);
#else
        std::cout << "Run on Windows: " << outputExecutable.string() << '\n';
        return 0;
#endif
    }
#ifndef _WIN32
    return Launch(outputExecutable, options.toWindows);
#else
    std::cout << "Run on Linux: " << outputExecutable.string() << '\n';
    return 0;
#endif
}

}
