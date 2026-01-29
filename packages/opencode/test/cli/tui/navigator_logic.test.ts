import { createSignal, createEffect, createRoot } from "solid-js";
import { describe, expect, test, mock } from "bun:test";

describe("Navigator Logic Reproduction", () => {
    test("openFilePath should triggers loadFile exactly once via effect when path changes", async () => {
        createRoot(async (dispose) => {
            const [activePath, setActivePath] = createSignal<string | null>(null);
            const [loaded, setLoaded] = createSignal(true);

            // Mock loadFile
            const loadFile = mock((file: string, force: boolean) => {
                // console.log(`Loading ${file}, force=${force}`);
            });

            // The fixed logic from Navigator.tsx
            const openFilePath = (nextPath: string) => {
                const current = activePath();
                if (current !== nextPath) {
                    // Simulate setting loading flags activePath
                    setActivePath(nextPath);
                    // Explicit loadFile REMOVED here
                } else if (loaded()) {
                    loadFile(nextPath, true);
                }
            };

            // The effect from Navigator.tsx (simplified)
            createEffect(() => {
                const file = activePath();
                if (file) {
                    // In real code this is untracked, but here simple call is fine
                    loadFile(file, false);
                }
            });

            // ACT 1: Open a new file
            openFilePath("test.txt");

            // Allow effects to flush
            await new Promise(r => setTimeout(r, 10));

            // ASSERT 1
            expect(loadFile).toHaveBeenCalledTimes(1);
            expect(loadFile).toHaveBeenCalledWith("test.txt", false);

            // ACT 2: Open the SAME file again (force reload)
            openFilePath("test.txt");
            await new Promise(r => setTimeout(r, 10));

            // ASSERT 2
            // Should be called again with force=true via the imperative path
            // Effect should NOT run because activePath didn't change
            expect(loadFile).toHaveBeenCalledTimes(2);
            expect(loadFile).toHaveBeenLastCalledWith("test.txt", true);

            // ACT 3: Switch to another file
            openFilePath("other.txt");
            await new Promise(r => setTimeout(r, 10));

            // ASSERT 3
            expect(loadFile).toHaveBeenCalledTimes(3);
            expect(loadFile).toHaveBeenLastCalledWith("other.txt", false);

            dispose();
        });
    });

    test("Legacy broken logic would double call", async () => {
        createRoot(async (dispose) => {
            const [activePath, setActivePath] = createSignal<string | null>(null);
            const loadFile = mock((file: string, force: boolean) => { });

            // The BROKEN logic
            const openFilePath = (nextPath: string) => {
                const current = activePath();
                if (current !== nextPath) {
                    setActivePath(nextPath);
                    // BROKEN: Explicit loadFile called here
                    loadFile(nextPath, false);
                }
            };

            createEffect(() => {
                const file = activePath();
                if (file) {
                    loadFile(file, false);
                }
            });

            openFilePath("test.txt");
            await new Promise(r => setTimeout(r, 10));

            // This demonstrates the issue we fixed: it was called twice!
            expect(loadFile).toHaveBeenCalledTimes(2);

            dispose();
        });
    });
});
