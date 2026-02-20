import { isMacOS, isWindows } from "./os.ts";

export type ReturnTypes = "void" | "u32";
export type FnDef<T extends readonly string[], R extends ReturnTypes = "void"> = Omit<{ readonly parameters: T; readonly result: R; }, "nonblocking">;

export type GLFunctions = ReturnType<typeof initGL>;

// gl is initialized lazily after the OpenGL context is made current,
// because wglGetProcAddress requires an active context for OpenGL 1.2+ functions.
// Load OpenGL function pointers now that context is active
let gl: GLFunctions;

export function initializeGl(): GLFunctions {
    gl = initGL();

    return gl;
}

export function initGL() {
    return {
        // Core OpenGL 3.3 functions we'll use (lookup signatures in OpenGL documentation)
        "ClearColor": new Deno.UnsafeFnPointer(glGetProcAddress("glClearColor") as Deno.PointerObject<FnDef<["f32", "f32", "f32", "f32"]>>, { parameters: ["f32", "f32", "f32", "f32"], result: "void" }),
        "Clear": new Deno.UnsafeFnPointer(glGetProcAddress("glClear") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"], result: "void" }), // GL_COLOR_BUFFER_BIT
        "GenVertexArrays": new Deno.UnsafeFnPointer(glGetProcAddress("glGenVertexArrays") as Deno.PointerObject<FnDef<["i32", "pointer"]>>, { parameters: ["i32", "pointer"], result: "void" }), // count, &array
        "BindVertexArray": new Deno.UnsafeFnPointer(glGetProcAddress("glBindVertexArray") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"], result: "void" }), // array
        "GenBuffers": new Deno.UnsafeFnPointer(glGetProcAddress("glGenBuffers") as Deno.PointerObject<FnDef<["i32", "pointer"]>>, { parameters: ["i32", "pointer"], result: "void" }), // count, &buffer
        "BindBuffer": new Deno.UnsafeFnPointer(glGetProcAddress("glBindBuffer") as Deno.PointerObject<FnDef<["u32", "u32"]>>, { parameters: ["u32", "u32"], result: "void" }), // target, buffer
        "BufferData": new Deno.UnsafeFnPointer(glGetProcAddress("glBufferData") as Deno.PointerObject<FnDef<["u32", "usize", "pointer", "u32"]>>, { parameters: ["u32", "usize", "pointer", "u32"], result: "void" }), // target, size, data, usage
        "DeleteBuffers": new Deno.UnsafeFnPointer(glGetProcAddress("glDeleteBuffers") as Deno.PointerObject<FnDef<["u32", "pointer"]>>, { parameters: ["u32", "pointer"], result: "void" }), // target, size, data, usage
        "EnableVertexAttribArray": new Deno.UnsafeFnPointer(glGetProcAddress("glEnableVertexAttribArray") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"], result: "void" }), // index
        "VertexAttribPointer": new Deno.UnsafeFnPointer(glGetProcAddress("glVertexAttribPointer") as Deno.PointerObject<FnDef<["u32", "i32", "u32", "bool", "i32", "pointer"]>>, { parameters: ["u32", "i32", "u32", "bool", "i32", "pointer"], result: "void" }), // index, size, type, normalized, stride, pointer
        "CreateShader": new Deno.UnsafeFnPointer(glGetProcAddress("glCreateShader") as Deno.PointerObject<FnDef<["u32"], "u32">>, { parameters: ["u32"], result: "u32" }), // shaderType (GL_VERTEX_SHADER, GL_FRAGMENT_SHADER)
        "DeleteShader": new Deno.UnsafeFnPointer(glGetProcAddress("glDeleteShader") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"], result: "void" }), // shader
        "ShaderSource": new Deno.UnsafeFnPointer(glGetProcAddress("glShaderSource") as Deno.PointerObject<FnDef<["u32", "i32", "pointer", "pointer"]>>, { parameters: ["u32", "i32", "pointer", "pointer"], result: "void" }), // shader, count, string, length
        "CompileShader": new Deno.UnsafeFnPointer(glGetProcAddress("glCompileShader") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"], result: "void" }), // shader
        "GetShaderiv": new Deno.UnsafeFnPointer(glGetProcAddress("glGetShaderiv") as Deno.PointerObject<FnDef<["u32", "u32", "pointer"]>>, { parameters: ["u32", "u32", "pointer"], result: "void" }), // shader, pname, params (GL_COMPILE_STATUS)
        "GetShaderInfoLog": new Deno.UnsafeFnPointer(glGetProcAddress("glGetShaderInfoLog") as Deno.PointerObject<FnDef<["u32", "i32", "pointer", "pointer"]>>, { parameters: ["u32", "i32", "pointer", "pointer"], result: "void" }), // shader, maxLength, length, infoLog
        "CreateProgram": new Deno.UnsafeFnPointer(glGetProcAddress("glCreateProgram") as Deno.PointerObject<FnDef<[], "u32">>, { parameters: [], result: "u32" }), // program
        "AttachShader": new Deno.UnsafeFnPointer(glGetProcAddress("glAttachShader") as Deno.PointerObject<FnDef<["u32", "u32"]>>, { parameters: ["u32", "u32"], result: "void" }), // program, shader
        "LinkProgram": new Deno.UnsafeFnPointer(glGetProcAddress("glLinkProgram") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"], result: "void" }), // program
        "GetProgramiv": new Deno.UnsafeFnPointer(glGetProcAddress("glGetProgramiv") as Deno.PointerObject<FnDef<["u32", "u32", "pointer"]>>, { parameters: ["u32", "u32", "pointer"], result: "void" }), // program, pname, params (GL_LINK_STATUS)
        "GetProgramInfoLog": new Deno.UnsafeFnPointer(glGetProcAddress("glGetProgramInfoLog") as Deno.PointerObject<FnDef<["u32", "i32", "pointer", "pointer"]>>, { parameters: ["u32", "i32", "pointer", "pointer"], result: "void" }), // program, maxLength, length, infoLog
        "UseProgram": new Deno.UnsafeFnPointer(glGetProcAddress("glUseProgram") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"], result: "void" }), // program
        "DeleteProgram": new Deno.UnsafeFnPointer(glGetProcAddress("glDeleteProgram") as Deno.PointerObject<FnDef<["u32"]>>, { parameters: ["u32"], result: "void" }), // program
        "DrawArrays": new Deno.UnsafeFnPointer(glGetProcAddress("glDrawArrays") as Deno.PointerObject<FnDef<["u32", "i32", "i32"]>>, { parameters: ["u32", "i32", "i32"], result: "void" }), // mode (GL_TRIANGLES), first, count
        "DeleteVertexArrays": new Deno.UnsafeFnPointer(glGetProcAddress("glDeleteVertexArrays") as Deno.PointerObject<FnDef<["u32", "pointer"]>>, { parameters: ["u32", "pointer"], result: "void" }), // mode (GL_TRIANGLES), first, count
    };
}

export function glGetProcAddress(name: string): Deno.PointerObject {
    // Function address loader - platform specific (simplified for cross-platform, might need adjustments)

    let _opengl32Lib: Deno.DynamicLibrary<{ wglGetProcAddress: { parameters: ["pointer"]; result: "pointer" } }> | null = null;
    let _opengl32Handle: Deno.PointerValue | null = null;

    if (isWindows()) {
        const kernel32 = isWindows()
            ? Deno.dlopen("kernel32.dll", {
                "GetProcAddress": { parameters: ["pointer", "pointer"], result: "pointer" },
                "GetModuleHandleA": { parameters: ["pointer"], result: "pointer" },
            })
            : null;


        // Lazy-load opengl32.dll handle and library
        if (!_opengl32Lib) {
            _opengl32Lib = Deno.dlopen("opengl32.dll", {
                "wglGetProcAddress": { parameters: ["pointer"], result: "pointer" },
            });
        }
        if (!_opengl32Handle && kernel32) {
            const modName = new TextEncoder().encode("opengl32.dll\0");
            _opengl32Handle = kernel32.symbols.GetModuleHandleA(Deno.UnsafePointer.of(modName));
        }

        const nameBuffer = new TextEncoder().encode(name + "\0");
        const namePointer = Deno.UnsafePointer.of(nameBuffer);

        // First, try wglGetProcAddress (works for OpenGL 1.2+ / extension functions)
        let proc = _opengl32Lib.symbols.wglGetProcAddress(namePointer);

        // wglGetProcAddress returns NULL or small sentinel values (0x1, 0x2, 0x3) for
        // functions it doesn't know about (i.e., OpenGL 1.1 core functions like glClearColor)
        const procValue = proc ? Deno.UnsafePointer.value(proc) : 0n;
        if (procValue === 0n || (procValue > 0n && procValue <= 3n)) {
            // Fall back to GetProcAddress from opengl32.dll for OpenGL 1.0/1.1 functions
            if (kernel32 && _opengl32Handle) {
                proc = kernel32.symbols.GetProcAddress(_opengl32Handle, namePointer);
            }
        }

        if (proc === null) {
            throw new Error(`Failed to load OpenGL function: ${name}`);
        }

        return proc;
    } else if (isMacOS()) { // macOS (Core Profile - modern OpenGL) -  Assumes macOS has OpenGL context available by default
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
