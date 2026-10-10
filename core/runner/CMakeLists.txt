add_library(runner_core STATIC
        ${CMAKE_CURRENT_SOURCE_DIR}/src/Runner.cpp
)
target_include_directories(runner_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_link_libraries(runner_core PUBLIC relinker_core)

add_executable(leonps5 ${CMAKE_CURRENT_SOURCE_DIR}/main.cpp)
target_link_libraries(leonps5 PRIVATE runner_core)
set_target_properties(leonps5 runner_core PROPERTIES INTERPROCEDURAL_OPTIMIZATION TRUE)
set_target_properties(leonps5 PROPERTIES CXX_EXTENSIONS OFF)

if(BUILD_TESTING AND CMAKE_SYSTEM_NAME STREQUAL "Linux")
    add_test_executable(runner_e2e_tests ${CMAKE_CURRENT_SOURCE_DIR}/tests/RunnerTests.cpp)
    target_include_directories(runner_e2e_tests PRIVATE ${CMAKE_SOURCE_DIR}/core/relinker/relinker/tests)
    target_link_libraries(runner_e2e_tests PRIVATE runner_core)
    set_target_properties(runner_e2e_tests PROPERTIES CXX_EXTENSIONS OFF)
    add_test(NAME runner_e2e COMMAND runner_e2e_tests)
    set_tests_properties(runner_e2e PROPERTIES TIMEOUT 60)
endif()
