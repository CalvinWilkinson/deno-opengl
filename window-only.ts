// deno-lint-ignore-file explicit-function-return-type no-explicit-any

// --- GLFW FFI Bindings ---

const libPrefix = Deno.build.os === "windows" ? "" : "lib";
const libSuffix = Deno.build.os === "windows" ? ".dll" : Deno.build.os === "darwin" ? ".dylib" : ".so";

const libraryName = `${libPrefix}glfw3${libSuffix}`; // Adjust if your GLFW library is named differently

let dylibPath = "";

try {
    // Attempt to load from common system paths (adjust as needed for your system)
    if (Deno.build.os === "windows") {
        dylibPath = `K:\\SOFTWARE-DEVELOPMENT\\PLAYGROUNDS\\deno-playground\\${libraryName}`; // Example, might need to be adjusted
    } else if (Deno.build.os === "darwin") {
        dylibPath = `/usr/local/lib/${libraryName}`; // Homebrew default
        if (!await Deno.stat(dylibPath).catch(() => false)) {
            dylibPath = `/opt/homebrew/lib/${libraryName}`; // Apple Silicon Homebrew default
        }
        if (!await Deno.stat(dylibPath).catch(() => false)) {
            dylibPath = `/usr/lib/${libraryName}`; // System path fallback
        }
    } else { // Linux
        dylibPath = `/usr/lib/${libraryName}`; // Common path, might need to be adjusted based on distro
        if (!await Deno.stat(dylibPath).catch(() => false)) {
            dylibPath = `/usr/lib64/${libraryName}`; // 64-bit systems
        }
        if (!await Deno.stat(dylibPath).catch(() => false)) {
             dylibPath = `/usr/local/lib/${libraryName}`; // Local install path
        }
    }

    if (!await Deno.stat(dylibPath).catch(() => false)) {
        throw new Error(`Could not find GLFW library at: ${dylibPath}. Please ensure GLFW is installed and the library path is correct.`);
    }

} catch (e) {
    console.error(`Error finding GLFW library: ${e.message}`);
    Deno.exit(1);
}


const glfw = Deno.dlopen(dylibPath, {
    "glfwInit": { parameters: [], result: "i32" },
    "glfwCreateWindow": { parameters: ["i32", "i32", "pointer", "pointer", "pointer"], result: "pointer" }, // Window and monitor pointers
    "glfwMakeContextCurrent": { parameters: ["pointer"], result: "void" }, // Window pointer
    "glfwWindowShouldClose": { parameters: ["pointer"], result: "i32" }, // Window pointer
    "glfwPollEvents": { parameters: [], result: "void" },
    "glfwDestroyWindow": { parameters: ["pointer"], result: "void" }, // Window pointer
    "glfwTerminate": { parameters: [], result: "void" },
    "glfwSetWindowTitle": { parameters: ["pointer", "pointer"], result: "void" }, // Window pointer, title string
});

// --- Deno Code ---

async function showNativeWindow() {
    if (glfw.symbols.glfwInit() !== 1) {
        console.error("GLFW initialization failed");
        return;
    }

    const width = 800;
    const height = 600;
    const title = "Deno Native Window";

    // Allocate memory for the title string (required for FFI string passing)
    const titleBuffer = new TextEncoder().encode(title + "\0"); // Null-terminate
    const titlePointer = Deno.UnsafePointer.of(titleBuffer);

    const window = glfw.symbols.glfwCreateWindow(width, height, titlePointer, null, null); // Monitor and share are null for default

    if (window === null) {
        console.error("Failed to create GLFW window");
        glfw.symbols.glfwTerminate();
        return;
    }

    glfw.symbols.glfwMakeContextCurrent(window); // Make context current (might be needed even for basic window)

    // Set window title (example)
    glfw.symbols.glfwSetWindowTitle(window, titlePointer);


    // --- Message Loop ---
    while (glfw.symbols.glfwWindowShouldClose(window) === 0) {
        glfw.symbols.glfwPollEvents();
        // You would typically do rendering or other window-related tasks here
    }

    glfw.symbols.glfwDestroyWindow(window);
    glfw.symbols.glfwTerminate();
}

// --- Run ---
if (import.meta.main) {
    await showNativeWindow();
}
