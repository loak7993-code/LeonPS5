cmake_minimum_required(VERSION 3.16)
project(leonps5-launcher-native LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC OFF)

find_package(Qt6 REQUIRED COMPONENTS Widgets Network)

add_executable(leonps5-launcher-native
    main.cpp
    ApiClient.cpp
    Covers.cpp
    MainWindow.cpp
    StatsBar.cpp
)

add_executable(leonps5-launcher-native-shot
    screenshot.cpp
    ApiClient.cpp
    Covers.cpp
    MainWindow.cpp
    StatsBar.cpp
)

target_link_libraries(leonps5-launcher-native PRIVATE Qt6::Widgets Qt6::Network)
target_link_libraries(leonps5-launcher-native-shot PRIVATE Qt6::Widgets Qt6::Network)
target_compile_options(leonps5-launcher-native PRIVATE -Wall -Wextra)
