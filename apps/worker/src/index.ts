import { createClient } from 'redis';
import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv';

dotenv.config();

// Consumer client to pull code execution jobs from the Redis List
const client = createClient({
    url: process.env.REDIS_URL,
});

// Publisher client to send execution results back to the specific room via Redis Pub/Sub
const pubClient = createClient({
    url: process.env.REDIS_URL,
});

// NOTE ON SANDBOXING:
// This worker's own Dockerfile already installs Python, GCC/g++, and Go directly inside
// the worker image, and the worker itself is expected to run as a container (with
// --memory / --cpus / --network limits applied to that container by your orchestrator,
// e.g. docker run/compose or a Kubernetes pod spec). Because of that, code here compiles
// and runs submissions directly in this process/container rather than shelling out to a
// *second*, sibling `docker run` — spawning docker-in-docker from inside this container
// only works with extra socket-mounting setup, and even then the temp directories this
// worker creates (e.g. ./tmp/user-...) live inside *this* container's filesystem, not on
// the host, so a sibling container's bind mount would silently see an empty directory.
// If you want per-submission container isolation instead of process-level isolation,
// mount the Docker socket into this container and change buildAndRun to shell out to
// `docker run -v <hostTmpDir>:/usr/src/app ...` using a HOST path (not this container's
// internal path).

type ExecResult = { stdout: string; stderr: string; failed: boolean; timedOut?: boolean };

function runCommand(command: string, args: string[], options: { cwd: string; timeout: number; input?: string }): Promise<ExecResult> {
    return new Promise((resolve) => {
        const child = execFile(command, args, {
            cwd: options.cwd,
            timeout: options.timeout,
            maxBuffer: 10 * 1024 * 1024,
        }, (error, stdout, stderr) => {
            resolve({
                stdout: stdout || "",
                stderr: stderr || "",
                failed: !!error,
                timedOut: !!error && (error.killed || error.signal === "SIGTERM"),
            });
        });

        if (options.input !== undefined && child.stdin) {
            child.stdin.write(options.input);
            child.stdin.end();
        }
    });
}

// Compiles/runs a submission directly using the toolchain installed in this container.
// Returns the text that should be published back to the room.
async function buildAndRun(language: string, codeDir: string, input: string): Promise<string> {
    const TIMEOUT_MS = 20000;

    switch (language) {
        case "javascript": {
            const result = await runCommand("node", ["userCode.js"], { cwd: codeDir, timeout: TIMEOUT_MS, input });
            if (result.timedOut) return "Error: Code execution timed out (exceeded 20s limit).";
            return (result.stderr && result.stderr.trim()) || result.stdout || "Error: Execution failed with no output.";
        }

        case "python": {
            const result = await runCommand("python3", ["userCode.py"], { cwd: codeDir, timeout: TIMEOUT_MS, input });
            if (result.timedOut) return "Error: Code execution timed out (exceeded 20s limit).";
            return (result.stderr && result.stderr.trim()) || result.stdout || "Error: Execution failed with no output.";
        }

        case "cpp": {
            const compile = await runCommand("g++", ["userCode.cpp", "-o", "a.out"], { cwd: codeDir, timeout: TIMEOUT_MS });
            if (compile.failed) {
                return (compile.stderr && compile.stderr.trim()) || (compile.stdout && compile.stdout.trim()) || "Error: Compilation failed.";
            }
            const run = await runCommand("./a.out", [], { cwd: codeDir, timeout: TIMEOUT_MS, input });
            if (run.timedOut) return "Error: Code execution timed out (exceeded 20s limit).";
            return (run.stderr && run.stderr.trim()) || run.stdout || "Error: Execution failed with no output.";
        }

        case "go": {
            const result = await runCommand("go", ["run", "userCode.go"], { cwd: codeDir, timeout: TIMEOUT_MS, input });
            if (result.timedOut) return "Error: Code execution timed out (exceeded 20s limit).";
            return (result.stderr && result.stderr.trim()) || result.stdout || "Error: Execution failed with no output.";
        }

        default:
            return `Error: Unsupported language "${language}".`;
    }
}

// Core function: writes the submission to a temp directory, compiles/runs it with the
// installed toolchain, and publishes the result back to the room.
async function processSubmission(submission: any) {
    const { code, language, roomId, submissionId, input } = JSON.parse(submission);

    console.log(JSON.stringify(submission));
    console.log(`Processing submission for room id: ${roomId}, submission id: ${submissionId}`);

    // 1. Create a unique temporary directory for this specific job to prevent collisions
    const codeDir = path.resolve(`./tmp/user-${Date.now()}`);
    await fs.mkdir(codeDir, { recursive: true });

    let result = "";

    try {
        // 2. Write the code file for the requested language
        const filenames: Record<string, string> = {
            javascript: "userCode.js",
            python: "userCode.py",
            cpp: "userCode.cpp",
            go: "userCode.go",
        };
        const filename = filenames[language];
        if (!filename) {
            throw new Error(`Unsupported language: ${language}`);
        }
        await fs.writeFile(path.join(codeDir, filename), code);

        // 3. Compile/run with a timeout, capturing output
        result = await buildAndRun(language, codeDir, input ?? "");
    } catch (e: any) {
        console.error("Failed to process submission", e);
        result = `Error: ${e?.message || "Execution failed."}`;
    }

    console.log(`Result for room ${roomId}: ${result}`);

    try {
        // 4. Publish the output back to the Redis room channel so the WebSocket server can broadcast it to users
        await pubClient.publish(roomId, result);
    } catch (e) {
        console.error("Failed to publish result to Redis,", e)
    }

    try {
        // 5. Clean up the temporary directory to free up disk space
        await fs.rm(codeDir, { recursive: true, force: true });
    } catch (cleanupError) {
        console.error("Failed to clean up directory:", cleanupError);
    }
}

async function main() {
    while (true) {
        try {
            if (!client.isOpen) await client.connect();
            if (!pubClient.isOpen) await pubClient.connect();

            console.log("Redis Client Connected");

            while (true) {
                // Blocking POP: Waits indefinitely until a new job appears in the "problems" queue
                const submission = await client.brPop("problems", 0);
                if (submission) {
                    await processSubmission(submission.element);
                }
            }
        } catch (error) {
            console.error("Failed to connect or communicating with Redis. Retrying in 5s...", error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

main();