import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeNewUserWelcomePending,
  consumeWelcomePending,
  markNewUserWelcomePending,
  markWelcomePending,
  pruneStaleNewUserWelcomeFlag,
} from "./welcome";

const NEW_USER_WELCOME_KEY = "mercurius-new-user-welcome";
const RETURNING_WELCOME_KEY = "mercurius-show-welcome";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe("welcome flags", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00Z"));
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("new-user welcome", () => {
    it("consumes a fresh flag within 7 days", () => {
      markNewUserWelcomePending();

      expect(consumeNewUserWelcomePending()).toBe(true);
      expect(localStorage.getItem(NEW_USER_WELCOME_KEY)).toBeNull();
    });

    it("rejects and removes a flag older than 7 days", () => {
      markNewUserWelcomePending();
      vi.advanceTimersByTime(SEVEN_DAYS_MS + 1);

      expect(consumeNewUserWelcomePending()).toBe(false);
      expect(localStorage.getItem(NEW_USER_WELCOME_KEY)).toBeNull();
    });

    it("accepts a flag just inside the 7-day window", () => {
      markNewUserWelcomePending();
      vi.advanceTimersByTime(SEVEN_DAYS_MS);

      expect(consumeNewUserWelcomePending()).toBe(true);
    });

    it("rejects and removes legacy plain \"1\" flags", () => {
      localStorage.setItem(NEW_USER_WELCOME_KEY, "1");

      expect(consumeNewUserWelcomePending()).toBe(false);
      expect(localStorage.getItem(NEW_USER_WELCOME_KEY)).toBeNull();
    });

    it("rejects and removes malformed JSON flags", () => {
      localStorage.setItem(NEW_USER_WELCOME_KEY, "{not-json");

      expect(consumeNewUserWelcomePending()).toBe(false);
      expect(localStorage.getItem(NEW_USER_WELCOME_KEY)).toBeNull();
    });

    it("prunes stale flags without consuming fresh ones", () => {
      markNewUserWelcomePending();
      vi.advanceTimersByTime(SEVEN_DAYS_MS + 1);
      pruneStaleNewUserWelcomeFlag();

      expect(localStorage.getItem(NEW_USER_WELCOME_KEY)).toBeNull();

      markNewUserWelcomePending();
      pruneStaleNewUserWelcomeFlag();

      expect(localStorage.getItem(NEW_USER_WELCOME_KEY)).not.toBeNull();
    });
  });

  describe("returning-user welcome", () => {
    it("consumes a pending returning-user flag", () => {
      markWelcomePending();

      expect(consumeWelcomePending()).toBe(true);
      expect(sessionStorage.getItem(RETURNING_WELCOME_KEY)).toBeNull();
    });

    it("returns false when no returning-user flag is set", () => {
      expect(consumeWelcomePending()).toBe(false);
    });
  });

  describe("flow isolation", () => {
    it("keeps new-user and returning-user flags independent", () => {
      markNewUserWelcomePending();
      markWelcomePending();

      expect(consumeNewUserWelcomePending()).toBe(true);
      expect(consumeWelcomePending()).toBe(true);
    });

    it("does not clear the other storage when one flag is consumed", () => {
      markNewUserWelcomePending();
      markWelcomePending();

      expect(consumeWelcomePending()).toBe(true);
      expect(localStorage.getItem(NEW_USER_WELCOME_KEY)).not.toBeNull();

      expect(consumeNewUserWelcomePending()).toBe(true);
      expect(sessionStorage.getItem(RETURNING_WELCOME_KEY)).toBeNull();
    });
  });
});