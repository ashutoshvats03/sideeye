import { describe, it, expect, afterEach } from "bun:test";
import { rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  sanitizeImageName,
  buildStoredFilename,
  saveImage,
  deleteImage,
  ALLOWED_IMAGE_EXTENSIONS,
} from "./storage.js";

const TEST_DIR = join(tmpdir(), "sideeye-storage-test");

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("storage filename rules", () => {
  it("rejects non-image extensions", () => {
    expect(() => sanitizeImageName("payload.exe")).toThrow();
    expect(() => sanitizeImageName("script.svg")).toThrow();
  });

  it("strips path traversal to a bare filename", () => {
    const name = sanitizeImageName("../../etc/passwd.png");
    expect(name).not.toContain("/");
    expect(name).not.toContain("\\");
    expect(name).not.toContain("..");
    expect(name.endsWith(".png")).toBe(true);
  });

  it("builds a unique stored filename preserving the extension", () => {
    const a = buildStoredFilename("My Photo.JPG");
    const b = buildStoredFilename("My Photo.JPG");
    expect(a).not.toBe(b);
    expect(a.endsWith(".jpg")).toBe(true);
    expect(ALLOWED_IMAGE_EXTENSIONS).toContain(".jpg");
  });
});

describe("storage roundtrip", () => {
  it("saves bytes to disk and returns a public /uploads URL", async () => {
    const url = await saveImage(Buffer.from("fake-image-bytes"), "necklace.png", {
      dir: TEST_DIR,
    });
    expect(url.startsWith("/uploads/")).toBe(true);
    expect(url.endsWith(".png")).toBe(true);
    const files = await readdir(TEST_DIR);
    expect(files.length).toBe(1);
  });

  it("rejects empty buffers", async () => {
    let failed = false;
    try {
      await saveImage(Buffer.alloc(0), "empty.png", { dir: TEST_DIR });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it("deletes a previously saved file and refuses outside URLs", async () => {
    const url = await saveImage(Buffer.from("bytes"), "ring.webp", {
      dir: TEST_DIR,
    });
    expect(await deleteImage(url, { dir: TEST_DIR })).toBe(true);
    expect(await deleteImage(url, { dir: TEST_DIR })).toBe(false);
    expect(await deleteImage("https://evil.example/x.png")).toBe(false);
  });
});
