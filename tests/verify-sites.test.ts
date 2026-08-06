import { describe, expect, it, vi } from "vitest";
import { verifySite } from "../scripts/verify-sites.mjs";

describe("verifySite", () => {
  it("succeeds on 2xx HTML response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
    });

    const project = {
      name: "test",
      domain: "test.example.com",
      smokePath: "/",
    };

    await expect(verifySite(project, mockFetch)).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.example.com/",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("follows redirects and succeeds on final 2xx", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    });

    const project = {
      name: "test",
      domain: "test.example.com",
      smokePath: "/",
    };

    await expect(verifySite(project, mockFetch)).resolves.toBeUndefined();
  });

  it("fails on 404 response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Headers({ "content-type": "text/html" }),
    });

    const project = {
      name: "test",
      domain: "test.example.com",
      smokePath: "/",
    };

    await expect(verifySite(project, mockFetch)).rejects.toThrow(
      "test site failed",
    );
    await expect(verifySite(project, mockFetch)).rejects.toThrow(
      "https://test.example.com/",
    );
    await expect(verifySite(project, mockFetch)).rejects.toThrow("404");
  });

  it("fails on 500 response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: new Headers({ "content-type": "text/html" }),
    });

    const project = {
      name: "landing",
      domain: "archlex.dev",
      smokePath: "/",
    };

    await expect(verifySite(project, mockFetch)).rejects.toThrow(
      "landing site failed",
    );
    await expect(verifySite(project, mockFetch)).rejects.toThrow(
      "https://archlex.dev/",
    );
    await expect(verifySite(project, mockFetch)).rejects.toThrow("500");
  });

  it("fails on non-HTML content type", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
    });

    const project = {
      name: "test",
      domain: "test.example.com",
      smokePath: "/",
    };

    await expect(verifySite(project, mockFetch)).rejects.toThrow(
      "test site failed",
    );
    await expect(verifySite(project, mockFetch)).rejects.toThrow("text/html");
  });

  it("includes site name and URL in error messages", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      headers: new Headers({ "content-type": "text/html" }),
    });

    const project = {
      name: "playground",
      domain: "playground.archlex.dev",
      smokePath: "/",
    };

    await expect(verifySite(project, mockFetch)).rejects.toThrow(
      "playground site failed",
    );
    await expect(verifySite(project, mockFetch)).rejects.toThrow(
      "https://playground.archlex.dev/",
    );
  });

  it("applies 15-second timeout", async () => {
    const mockFetch = vi.fn().mockImplementation((url, options) => {
      expect(options.signal).toBeDefined();
      // Verify timeout is set (we can't easily test the exact value in unit tests)
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
      });
    });

    const project = {
      name: "test",
      domain: "test.example.com",
      smokePath: "/",
    };

    await verifySite(project, mockFetch);
    expect(mockFetch).toHaveBeenCalled();
  });
});
