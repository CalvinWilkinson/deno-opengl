import { emptyDirSync, exists, existsSync } from "jsr:@std/fs@1.0.11";
// deno-lint-ignore-file explicit-function-return-type no-explicit-any

// --- GLFW FFI Bindings (same as before) ---
const libPrefix = Deno.build.os === "windows" ? "" : "lib";
const libSuffix = Deno.build.os === "windows" ? ".dll" : Deno.build.os === "darwin" ? ".dylib" : ".so";
const libraryName = `${libPrefix}glfw3${libSuffix}`;

let dylibPath = "";
// ... (Library path finding logic - same as before, ensure GLFW is installed correctly) ...
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

    if (!existsSync(dylibPath, { isFile: true, isDirectory: false })) {
        throw new Error(`Could not find GLFW library at: ${dylibPath}. Please ensure GLFW is installed and the library path is correct.`);
    }

} catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error finding GLFW library: ${errorMsg}`);
    Deno.exit(1);
}


const glfw = Deno.dlopen(dylibPath, {
    "glfwInit": { parameters: [], result: "i32" },
    "glfwCreateWindow": { parameters: ["i32", "i32", "pointer", "pointer", "pointer"], result: "pointer" },
    "glfwMakeContextCurrent": { parameters: ["pointer"], result: "void" },
    "glfwWindowShouldClose": { parameters: ["pointer"], result: "i32" },
    "glfwPollEvents": { parameters: [], result: "void" },
    "glfwDestroyWindow": { parameters: ["pointer"], result: "void" },
    "glfwTerminate": { parameters: [], result: "void" },
    "glfwSwapBuffers": { parameters: ["pointer"], result: "void" }, // For double buffering
    "glfwSetWindowTitle": { parameters: ["pointer", "pointer"], result: "void" },
    "glfwGetProcAddress": { parameters: ["pointer"], result: "pointer" }, // For OpenGL function loading (generic)
});


// --- OpenGL 3.3 Core Profile Function Bindings (minimal set for a triangle) ---

// Function address loader - platform specific (simplified for cross-platform, might need adjustments)

function glGetProcAddress<R extends FnDef>(name: string): Deno.PointerObject<R> {
    if (Deno.build.os === "windows") {
        const opengl32 = Deno.dlopen("K:\\SOFTWARE-DEVELOPMENT\\PLAYGROUNDS\\deno-playground\\opengl32.dll", {
            "wglGetProcAddress": { parameters: ["pointer"], result: "pointer" },
        });

        const nameBuffer = new TextEncoder().encode(name + "\0");
        const namePointer = Deno.UnsafePointer.of(nameBuffer);
        const proc = opengl32.symbols.wglGetProcAddress(namePointer);

        if (proc === null) {
            throw new Error(`Failed to load OpenGL function: ${name}`); // Very basic error handling
        }

        return proc;
    } else if (Deno.build.os === "darwin") { // macOS (Core Profile - modern OpenGL) -  Assumes macOS has OpenGL context available by default
        // // macOS may require more involved context creation for Core Profile. This might be a simplification
        // const frameworkPath = "/System/Library/Frameworks/OpenGL.framework/OpenGL"; // Path to OpenGL framework on macOS
        // const openglFramework = Deno.dlopen(frameworkPath, {
        //     "NSGLGetProcAddress": { parameters: ["pointer"], result: "pointer" } // macOS specific
        // });
        // glGetProcAddress = (name: string) => {
        //     const proc = openglFramework.symbols.NSGLGetProcAddress(new TextEncoder().encode(name + "\0"));
        //     if (proc === null) {
        //          throw new Error(`Failed to load OpenGL function: ${name}`);
        //     }
        //     return proc;
        // };
    } else { // Linux (and potentially other Unix-like) - Assumes GLX (X11) or EGL (Wayland/headless) context, GLX is more common for desktop X11
        // const libGL = Deno.dlopen("libGL.so.1", { // Or libGL.so.0, check your system. Might need more robust path finding.
        //     "glXGetProcAddress": { parameters: ["pointer"], result: "pointer" }, // GLX (X11) function loader
        // });
        // glGetProcAddress = (name: string) => {
        //     const proc = libGL.symbols.glXGetProcAddress(new TextEncoder().encode(name + "\0"));
        //     if (proc === null) {
        //          throw new Error(`Failed to load OpenGL function: ${name}`);
        //     }
        //     return proc;
        // };
    }

    throw new Error("Unsupported platform for OpenGL function loading");
}

// OpenGL function type definitions (minimal set - adjust as needed)
type GLvoidptr = Deno.PointerValue<void>; //  Pointer to void
type GLsizeiptr = number;                //  GLsizeiptr is often ptrdiff_t (signed), but number in JS
type GLintptr = number;                 //  GLintptr is often ptrdiff_t (signed), but number in JS
type GLenum = number;
type GLuint = number;
type GLint = number;
type GLsizei = number;
type GLboolean = number; // GLboolean is often byte or GLubyte (unsigned char), but number (0 or 1) in JS
type GLfloat = number;

type ReturnTypes = "void" | "u32";

// type FnPointerParam<T extends readonly any[], R extends string> = Omit<{ readonly parameters: T; readonly result: "void"; }, "nonblocking">;
type FnDef<T extends readonly string[], R extends ReturnTypes = "void"> = Omit<{ readonly parameters: T; readonly result: R; }, "nonblocking">;

// const stuff = new Deno.UnsafeCallback({ parameters: ["f32", "f32", "f32", "f32"], result: "void" }, (a: number) => {}).pointer;
// stuff.pointer;
// "ClearColor": new Deno.UnsafeFnPointer(new Deno.UnsafeCallback({ parameters: ["f32", "f32", "f32", "f32"], result: "void" }, (a: number) => {}).pointer, { parameters: ["f32", "f32", "f32", "f32"], result: "void" }),


const gl = {
    // Core OpenGL 3.3 functions we'll use (lookup signatures in OpenGL documentation)
    "ClearColor": new Deno.UnsafeFnPointer(glGetProcAddress("glClearColor") as Deno.PointerObject<FnDef<["f32", "f32", "f32", "f32"]>>, { parameters: ["f32", "f32", "f32", "f32"], result: "void" }),
    "Clear":      new Deno.UnsafeFnPointer(glGetProcAddress("glClear") as Deno.PointerObject<FnDef<["u32"]>>,      { parameters: ["u32"],                   result: "void" }), // GL_COLOR_BUFFER_BIT
    "GenVertexArrays":  new Deno.UnsafeFnPointer(glGetProcAddress("glGenVertexArrays") as Deno.PointerObject<FnDef<["i32", "pointer"]>>, { parameters: ["i32", "pointer"],           result: "void" }), // count, &array
    "BindVertexArray":  new Deno.UnsafeFnPointer(glGetProcAddress("glBindVertexArray") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"],                   result: "void" }), // array
    "GenBuffers":       new Deno.UnsafeFnPointer(glGetProcAddress("glGenBuffers") as Deno.PointerObject<FnDef<["i32", "pointer"]>>,      { parameters: ["i32", "pointer"],           result: "void" }), // count, &buffer
    "BindBuffer":       new Deno.UnsafeFnPointer(glGetProcAddress("glBindBuffer") as Deno.PointerObject<FnDef<["u32", "u32"]>>,      { parameters: ["u32", "u32"],               result: "void" }), // target, buffer
    "BufferData":       new Deno.UnsafeFnPointer(glGetProcAddress("glBufferData") as Deno.PointerObject<FnDef<["u32", "usize", "pointer", "u32"]>>,      { parameters: ["u32", "usize", "pointer", "u32"], result: "void" }), // target, size, data, usage
    "DeleteBuffers":       new Deno.UnsafeFnPointer(glGetProcAddress("glDeleteBuffers") as Deno.PointerObject<FnDef<["u32", "pointer"]>>,      { parameters: ["u32", "pointer"], result: "void" }), // target, size, data, usage
    "EnableVertexAttribArray": new Deno.UnsafeFnPointer(glGetProcAddress("glEnableVertexAttribArray") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"],        result: "void" }), // index
    "VertexAttribPointer":     new Deno.UnsafeFnPointer(glGetProcAddress("glVertexAttribPointer") as Deno.PointerObject<FnDef<["u32", "i32", "u32", "bool", "i32", "pointer"]>>,     { parameters: ["u32", "i32", "u32", "bool", "i32", "pointer"], result: "void" }), // index, size, type, normalized, stride, pointer
    "CreateShader":      new Deno.UnsafeFnPointer(glGetProcAddress("glCreateShader") as Deno.PointerObject<FnDef<["u32"], "u32">>,{ parameters: ["u32"],                   result: "u32" }), // shaderType (GL_VERTEX_SHADER, GL_FRAGMENT_SHADER)
    "DeleteShader":      new Deno.UnsafeFnPointer(glGetProcAddress("glDeleteShader") as Deno.PointerObject<FnDef<["u32"]>>,{ parameters: ["u32"],                   result: "void" }), // shader
    "ShaderSource":      new Deno.UnsafeFnPointer(glGetProcAddress("glShaderSource") as Deno.PointerObject<FnDef<["u32", "i32", "pointer", "pointer"]>>,     { parameters: ["u32", "i32", "pointer", "pointer"], result: "void" }), // shader, count, string, length
    "CompileShader":     new Deno.UnsafeFnPointer(glGetProcAddress("glCompileShader") as Deno.PointerObject<FnDef<["u32"]>>,    { parameters: ["u32"],                   result: "void" }), // shader
    "GetShaderiv":       new Deno.UnsafeFnPointer(glGetProcAddress("glGetShaderiv") as Deno.PointerObject<FnDef<["u32", "u32", "pointer"]>>,      { parameters: ["u32", "u32", "pointer"],           result: "void" }), // shader, pname, params (GL_COMPILE_STATUS)
    "GetShaderInfoLog":  new Deno.UnsafeFnPointer(glGetProcAddress("glGetShaderInfoLog") as Deno.PointerObject<FnDef<["u32", "i32", "pointer", "pointer"]>>, { parameters: ["u32", "i32", "pointer", "pointer"], result: "void" }), // shader, maxLength, length, infoLog
    "CreateProgram":     new Deno.UnsafeFnPointer(glGetProcAddress("glCreateProgram") as Deno.PointerObject<FnDef<[], "u32">>,    { parameters: [],                        result: "u32" }), // program
    "AttachShader":      new Deno.UnsafeFnPointer(glGetProcAddress("glAttachShader") as Deno.PointerObject<FnDef<["u32", "u32"]>>,     { parameters: ["u32", "u32"],               result: "void" }), // program, shader
    "LinkProgram":       new Deno.UnsafeFnPointer(glGetProcAddress("glLinkProgram") as Deno.PointerObject<FnDef<["u32"]>>,      { parameters: ["u32"],                   result: "void" }), // program
    "GetProgramiv":      new Deno.UnsafeFnPointer(glGetProcAddress("glGetProgramiv") as Deno.PointerObject<FnDef<["u32", "u32", "pointer"]>>,     { parameters: ["u32", "u32", "pointer"],           result: "void" }), // program, pname, params (GL_LINK_STATUS)
    "GetProgramInfoLog": new Deno.UnsafeFnPointer(glGetProcAddress("glGetProgramInfoLog") as Deno.PointerObject<FnDef<["u32", "i32", "pointer", "pointer"]>>, { parameters: ["u32", "i32", "pointer", "pointer"], result: "void" }), // program, maxLength, length, infoLog
    "UseProgram":        new Deno.UnsafeFnPointer(glGetProcAddress("glUseProgram") as Deno.PointerObject<FnDef<["u32"]>>,       { parameters: ["u32"],                   result: "void" }), // program
    "DeleteProgram":        new Deno.UnsafeFnPointer(glGetProcAddress("glDeleteProgram") as Deno.PointerObject<FnDef<["u32"]>>,       { parameters: ["u32"],                   result: "void" }), // program
    "DrawArrays":        new Deno.UnsafeFnPointer(glGetProcAddress("glDrawArrays") as Deno.PointerObject<FnDef<["u32", "i32", "i32"]>>,       { parameters: ["u32", "i32", "i32"],               result: "void" }), // mode (GL_TRIANGLES), first, count
    "DeleteVertexArrays":        new Deno.UnsafeFnPointer(glGetProcAddress("glDeleteVertexArrays") as Deno.PointerObject<FnDef<["u32", "pointer"]>>,       { parameters: ["u32", "pointer"],               result: "void" }), // mode (GL_TRIANGLES), first, count
};

// const gl = {
//     // Core OpenGL 3.3 functions we'll use (lookup signatures in OpenGL documentation)
//     "ClearColor": new Deno.UnsafeFnPointer(new Deno.UnsafeCallback({ parameters: ["f32", "f32", "f32", "f32"], result: "void" }, (a: number) => {}).pointer, { parameters: ["f32", "f32", "f32", "f32"], result: "void" }),
//     "Clear":      new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glClear") as Deno.PointerObject<FnDef<["u32"]>>,      { parameters: ["u32"],                   result: "void" }), // GL_COLOR_BUFFER_BIT
//     "GenVertexArrays":  new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glGenVertexArrays") as Deno.PointerObject<FnDef<["i32", "pointer"]>>, { parameters: ["i32", "pointer"],           result: "void" }), // count, &array
//     "BindVertexArray":  new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glBindVertexArray") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"],                   result: "void" }), // array
//     "GenBuffers":       new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glGenBuffers") as Deno.PointerObject<FnDef<["i32", "pointer"]>>,      { parameters: ["i32", "pointer"],           result: "void" }), // count, &buffer
//     "BindBuffer":       new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glBindBuffer") as Deno.PointerObject<FnDef<["u32", "u32"]>>,      { parameters: ["u32", "u32"],               result: "void" }), // target, buffer
//     "BufferData":       new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glBufferData") as Deno.PointerObject<FnDef<["u32", "usize", "pointer", "u32"]>>,      { parameters: ["u32", "usize", "pointer", "u32"], result: "void" }), // target, size, data, usage
//     "DeleteBuffers":       new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glDeleteBuffers") as Deno.PointerObject<FnDef<["u32", "pointer"]>>,      { parameters: ["u32", "pointer"], result: "void" }), // target, size, data, usage
//     "EnableVertexAttribArray": new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glEnableVertexAttribArray") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"],        result: "void" }), // index
//     "VertexAttribPointer":     new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glVertexAttribPointer") as Deno.PointerObject<FnDef<["u32", "i32", "u32", "bool", "i32", "pointer"]>>,     { parameters: ["u32", "i32", "u32", "bool", "i32", "pointer"], result: "void" }), // index, size, type, normalized, stride, pointer
//     "CreateShader":      new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glCreateShader") as Deno.PointerObject<FnDef<["u32"], "u32">>,{ parameters: ["u32"],                   result: "u32" }), // shaderType (GL_VERTEX_SHADER, GL_FRAGMENT_SHADER)
//     "DeleteShader":      new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glDeleteShader") as Deno.PointerObject<FnDef<["u32"]>>,{ parameters: ["u32"],                   result: "void" }), // shader
//     "ShaderSource":      new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glShaderSource") as Deno.PointerObject<FnDef<["u32", "i32", "pointer", "pointer"]>>,     { parameters: ["u32", "i32", "pointer", "pointer"], result: "void" }), // shader, count, string, length
//     "CompileShader":     new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glCompileShader") as Deno.PointerObject<FnDef<["u32"]>>,    { parameters: ["u32"],                   result: "void" }), // shader
//     "GetShaderiv":       new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glGetShaderiv") as Deno.PointerObject<FnDef<["u32", "u32", "pointer"]>>,      { parameters: ["u32", "u32", "pointer"],           result: "void" }), // shader, pname, params (GL_COMPILE_STATUS)
//     "GetShaderInfoLog":  new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glGetShaderInfoLog") as Deno.PointerObject<FnDef<["u32", "i32", "pointer", "pointer"]>>, { parameters: ["u32", "i32", "pointer", "pointer"], result: "void" }), // shader, maxLength, length, infoLog
//     "CreateProgram":     new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glCreateProgram") as Deno.PointerObject<FnDef<[], "u32">>,    { parameters: [],                        result: "u32" }), // program
//     "AttachShader":      new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glAttachShader") as Deno.PointerObject<FnDef<["u32", "u32"]>>,     { parameters: ["u32", "u32"],               result: "void" }), // program, shader
//     "LinkProgram":       new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glLinkProgram") as Deno.PointerObject<FnDef<["u32"]>>,      { parameters: ["u32"],                   result: "void" }), // program
//     "GetProgramiv":      new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glGetProgramiv") as Deno.PointerObject<FnDef<["u32", "u32", "pointer"]>>,     { parameters: ["u32", "u32", "pointer"],           result: "void" }), // program, pname, params (GL_LINK_STATUS)
//     "GetProgramInfoLog": new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glGetProgramInfoLog") as Deno.PointerObject<FnDef<["u32", "i32", "pointer", "pointer"]>>, { parameters: ["u32", "i32", "pointer", "pointer"], result: "void" }), // program, maxLength, length, infoLog
//     "UseProgram":        new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glUseProgram") as Deno.PointerObject<FnDef<["u32"]>>,       { parameters: ["u32"],                   result: "void" }), // program
//     "DeleteProgram":        new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glDeleteProgram") as Deno.PointerObject<FnDef<["u32"]>>,       { parameters: ["u32"],                   result: "void" }), // program
//     "DrawArrays":        new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glDrawArrays") as Deno.PointerObject<FnDef<["u32", "i32", "i32"]>>,       { parameters: ["u32", "i32", "i32"],               result: "void" }), // mode (GL_TRIANGLES), first, count
//     "DeleteVertexArrays":        new Deno.UnsafeFnPointer(new Deno.UnsafeCallback(), ("glDeleteVertexArrays") as Deno.PointerObject<FnDef<["u32", "pointer"]>>,       { parameters: ["u32", "pointer"],               result: "void" }), // mode (GL_TRIANGLES), first, count
// };


// --- Shader Source Code (GLSL) ---

const vertexShaderSource = `#version 330 core
layout (location = 0) in vec2 aPos; // Vertex position attribute (location 0)

void main()
{
    gl_Position = vec4(aPos.x, aPos.y, 0.0, 1.0); // Simple pass-through for 2D
}
`;

const fragmentShaderSource = `#version 330 core
out vec4 FragColor;

void main()
{
    FragColor = vec4(1.0, 0.5, 0.2, 1.0); // Orange color (R, G, B, Alpha)
}
`;

function compileShader(type: GLenum, source: string): GLuint {
    const shader = gl.CreateShader.call(type);
    if (shader === 0) {
        throw new Error("Failed to create shader");
    }

    const sourceBuffer = new TextEncoder().encode(source + "\0"); // Null-terminate
    const sourcePtr = Deno.UnsafePointer.of(sourceBuffer);
    const length = sourceBuffer.byteLength -1; // Exclude null terminator in length


    const sourcePtrPtr = Deno.UnsafePointer.of(new BigUint64Array([Deno.UnsafePointer.value(sourcePtr)])); // Pointer to pointer


    const lengthPtr = Deno.UnsafePointer.of(new Int32Array([length]));
    gl.ShaderSource.call(shader, 1, sourcePtrPtr, lengthPtr);
    gl.CompileShader.call(shader);

    const success = new Uint32Array(1);
    gl.GetShaderiv.call(shader, 0x8B81, Deno.UnsafePointer.of(success)); // GL_COMPILE_STATUS = 0x8B81

    if (success[0] === 0) {
        const infoLogLength = new Int32Array(1);
        gl.GetShaderiv.call(shader, 0x8B84, Deno.UnsafePointer.of(infoLogLength)); // GL_INFO_LOG_LENGTH = 0x8B84
        const infoLogBuffer = new Uint8Array(infoLogLength[0]);
        gl.GetShaderInfoLog.call(shader, infoLogLength[0], null, Deno.UnsafePointer.of(infoLogBuffer));
        const infoLog = new TextDecoder().decode(infoLogBuffer);
        gl.DeleteShader?.call(shader); // Optional, if you added glDeleteShader binding
        throw new Error(`Shader compilation error:\n${infoLog}`);
    }

    return shader;
}


function createShaderProgram(vertexShaderSource: string, fragmentShaderSource: string): GLuint {
    const vertexShader = compileShader(0x8B31, vertexShaderSource); // GL_VERTEX_SHADER = 0x8B31
    const fragmentShader = compileShader(0x8B30, fragmentShaderSource); // GL_FRAGMENT_SHADER = 0x8B30

    const program = gl.CreateProgram.call();
    if (program === 0) {
        throw new Error("Failed to create shader program");
    }

    gl.AttachShader.call(program, vertexShader);
    gl.AttachShader.call(program, fragmentShader);
    gl.LinkProgram.call(program);

    const success = new Uint32Array(1);
    gl.GetProgramiv.call(program, 0x8B82, Deno.UnsafePointer.of(success)); // GL_LINK_STATUS = 0x8B82
    if (success[0] === 0) {
        const infoLogLength = new Int32Array(1);
        gl.GetProgramiv.call(program, 0x8B84, Deno.UnsafePointer.of(infoLogLength)); // GL_INFO_LOG_LENGTH = 0x8B84
        const infoLogBuffer = new Uint8Array(infoLogLength[0]);
        gl.GetProgramInfoLog.call(program, infoLogLength[0], null, Deno.UnsafePointer.of(infoLogBuffer));
        const infoLog = new TextDecoder().decode(infoLogBuffer);
        gl.DeleteProgram?.call(program); // Optional, if you added glDeleteProgram binding
        gl.DeleteShader?.call(vertexShader); // Optional
        gl.DeleteShader?.call(fragmentShader); // Optional
        throw new Error(`Shader program linking error:\n${infoLog}`);
    }

    // Shaders can be deleted after linking into program (optional, cleanup)
    gl.DeleteShader?.call(vertexShader); // Optional
    gl.DeleteShader?.call(fragmentShader); // Optional


    return program;
}


// --- Deno Code for Window and OpenGL ---

async function showNativeWindowWithTriangle() {
    if (glfw.symbols.glfwInit() !== 1) {
        console.error("GLFW initialization failed");
        return;
    }

    const width = 800;
    const height = 600;
    const title = "Deno OpenGL Triangle";

    const titleBuffer = new TextEncoder().encode(title + "\0");
    const titlePointer = Deno.UnsafePointer.of(titleBuffer);

    const window = glfw.symbols.glfwCreateWindow(width, height, titlePointer, null, null);
    if (window === null) {
        console.error("Failed to create GLFW window");
        glfw.symbols.glfwTerminate();
        return;
    }

    glfw.symbols.glfwMakeContextCurrent(window); // Make the window's OpenGL context current

    // --- OpenGL Initialization ---

    // Vertex Data for a Triangle (Normalized Device Coordinates - NDC: [-1, 1] range)
    const triangleVertices = new Float32Array([
         0.0,  0.5,  // Top center
        -0.5, -0.5,  // Bottom left
         0.5, -0.5   // Bottom right
    ]);

    // Vertex Buffer Object (VBO)
    const vbo = new Uint32Array(1);
    gl.GenBuffers.call(1, Deno.UnsafePointer.of(vbo));
    gl.BindBuffer.call(0x8892, vbo[0]); // GL_ARRAY_BUFFER = 0x8892
    gl.BufferData.call(0x8892, BigInt(triangleVertices.byteLength), Deno.UnsafePointer.of(triangleVertices), 0x88E0); // GL_STATIC_DRAW = 0x88E0

    // Vertex Array Object (VAO)
    const vao = new Uint32Array(1);
    gl.GenVertexArrays.call(1, Deno.UnsafePointer.of(vao));
    gl.BindVertexArray.call(vao[0]);

    gl.BindBuffer.call(0x8892, vbo[0]); // Bind VBO to VAO

    // Position attribute pointer (location = 0 in vertex shader)
    gl.EnableVertexAttribArray.call(0); // Attribute location 0
    gl.VertexAttribPointer.call(0, 2, 0x1406, false, 0, null); // location=0, size=2, type=FLOAT=0x1406, normalized=false, stride=0, pointer_offset=0


    // Shader Program
    const shaderProgram = createShaderProgram(vertexShaderSource, fragmentShaderSource);


    // --- Rendering Loop ---
    while (glfw.symbols.glfwWindowShouldClose(window) === 0) {
        // Clear the color buffer
        gl.ClearColor.call(0.2, 0.3, 0.3, 1.0); // Cornflower blue-ish
        gl.Clear.call(0x4000); // GL_COLOR_BUFFER_BIT = 0x4000

        // Use shader program
        gl.UseProgram.call(shaderProgram);

        // Bind VAO (vertex data and attribute config is already set up in VAO)
        gl.BindVertexArray.call(vao[0]);

        // Draw the triangle (3 vertices)
        gl.DrawArrays.call(0x0004, 0, 3); // GL_TRIANGLES = 0x0004, first vertex index=0, vertex count=3

        // Swap the front and back buffers to display the rendered image
        glfw.symbols.glfwSwapBuffers(window);

        glfw.symbols.glfwPollEvents();
    }

    // --- Cleanup --- (Add more OpenGL cleanup if you create more objects)
    gl.DeleteProgram?.call(shaderProgram); // Optional cleanup (if you add glDeleteProgram binding)
    gl.DeleteVertexArrays?.call(1, Deno.UnsafePointer.of(vao)); // Optional cleanup (if you add glDeleteVertexArrays binding)
    gl.DeleteBuffers?.call(1, Deno.UnsafePointer.of(vbo));    // Optional cleanup (if you add glDeleteBuffers binding)

    glfw.symbols.glfwDestroyWindow(window);
    glfw.symbols.glfwTerminate();
}


// --- Run ---
if (import.meta.main) {
    await showNativeWindowWithTriangle();
}
