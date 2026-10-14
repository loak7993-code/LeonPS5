# CMake toolchain for cross-building the native launcher for Windows with the
# distro mingw-w64 cross compiler (or the MinGW GCC shipped alongside Qt via
# aqtinstall, which needs wine to run). Variables are CMAKE_-prefixed so they
# propagate into CMake's internal try_compile passes.
set(CMAKE_SYSTEM_NAME Windows)
set(CMAKE_SYSTEM_PROCESSOR x86_64)

set(CMAKE_QT_WIN_ROOT "" CACHE PATH "Qt for Windows root, e.g. /opt/qtwin/6.4.2/mingw_64")
set(CMAKE_MINGW_BIN "" CACHE PATH "MinGW toolchain bin directory")

if(NOT CMAKE_MINGW_BIN)
    set(CMAKE_MINGW_BIN "$ENV{LEONPS5_MINGW_BIN}")
endif()
if(NOT CMAKE_QT_WIN_ROOT)
    set(CMAKE_QT_WIN_ROOT "$ENV{LEONPS5_QT_WIN_ROOT}")
endif()
if(NOT CMAKE_MINGW_BIN)
    message(FATAL_ERROR "Set CMAKE_MINGW_BIN (or the LEONPS5_MINGW_BIN environment variable) to a MinGW bin directory")
endif()

if(EXISTS "${CMAKE_MINGW_BIN}/x86_64-w64-mingw32-g++")
    set(CMAKE_C_COMPILER "${CMAKE_MINGW_BIN}/x86_64-w64-mingw32-gcc")
    set(CMAKE_CXX_COMPILER "${CMAKE_MINGW_BIN}/x86_64-w64-mingw32-g++")
    set(CMAKE_RC_COMPILER "${CMAKE_MINGW_BIN}/x86_64-w64-mingw32-windres")
else()
    set(CMAKE_C_COMPILER "${CMAKE_MINGW_BIN}/gcc.exe")
    set(CMAKE_CXX_COMPILER "${CMAKE_MINGW_BIN}/g++.exe")
    set(CMAKE_RC_COMPILER "${CMAKE_MINGW_BIN}/windres.exe")
endif()

set(CMAKE_FIND_ROOT_PATH "${CMAKE_QT_WIN_ROOT}")
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)

set(CMAKE_PREFIX_PATH "${CMAKE_QT_WIN_ROOT}")
if(NOT CMAKE_QT_HOST_PATH)
    set(CMAKE_QT_HOST_PATH "$ENV{LEONPS5_QT_HOST_PATH}")
endif()
if(CMAKE_QT_HOST_PATH)
    set(QT_HOST_PATH "${CMAKE_QT_HOST_PATH}")
endif()
