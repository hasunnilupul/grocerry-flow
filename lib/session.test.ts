import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  normalizeShopper,
  sessionMaxAgeSeconds,
  verifySessionToken,
} from "./session";

const SECRET = "test-secret-value";
const NOW = Date.UTC(2026, 7, 25);

describe("session tokens", () => {
  it("verifies a token it just minted", async () => {
    const token = await createSessionToken(SECRET, NOW);
    await expect(verifySessionToken(token, SECRET, NOW)).resolves.toBe(true);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken(SECRET, NOW);
    await expect(verifySessionToken(token, "other-secret", NOW)).resolves.toBe(
      false,
    );
  });

  it("rejects a tampered expiry", async () => {
    const token = await createSessionToken(SECRET, NOW);
    const signature = token.slice(token.lastIndexOf(".") + 1);
    const forged = `${NOW + 10_000_000_000}.${signature}`;
    await expect(verifySessionToken(forged, SECRET, NOW)).resolves.toBe(false);
  });

  it("rejects an expired token", async () => {
    const token = await createSessionToken(SECRET, NOW);
    const wellPastExpiry = NOW + (sessionMaxAgeSeconds() + 60) * 1000;
    await expect(
      verifySessionToken(token, SECRET, wellPastExpiry),
    ).resolves.toBe(false);
  });

  it("rejects missing and malformed tokens", async () => {
    await expect(verifySessionToken(undefined, SECRET, NOW)).resolves.toBe(
      false,
    );
    await expect(verifySessionToken("", SECRET, NOW)).resolves.toBe(false);
    await expect(verifySessionToken("no-separator", SECRET, NOW)).resolves.toBe(
      false,
    );
    await expect(verifySessionToken(".sig", SECRET, NOW)).resolves.toBe(false);
    await expect(
      verifySessionToken("not-a-number.sig", SECRET, NOW),
    ).resolves.toBe(false);
  });
});

describe("normalizeShopper", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeShopper("  Nimal   Perera ")).toBe("Nimal Perera");
  });

  it("returns empty for a blank name", () => {
    expect(normalizeShopper("   ")).toBe("");
  });

  it("caps absurdly long names", () => {
    expect(normalizeShopper("a".repeat(100))).toHaveLength(40);
  });
});
