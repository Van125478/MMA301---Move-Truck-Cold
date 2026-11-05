import assert from "node:assert/strict";
import test from "node:test";
import {
  LOGIN_FAILURE_LIMIT,
  LOGIN_FAILURE_WINDOW_MS,
  clearLoginFailures,
  loginThrottleDecision,
  recordLoginFailure,
  resetLoginThrottle,
} from "../src/auth/loginThrottle.js";

test("eight failed logins in the window block the identifier until the window passes", () => {
  resetLoginThrottle();
  const key = "shipper.demo@coldi.local";
  const start = 1_700_000_000_000;
  for (let attempt = 0; attempt < LOGIN_FAILURE_LIMIT - 1; attempt += 1) {
    recordLoginFailure(key, start);
    assert.equal(loginThrottleDecision(key, start), "allow");
  }
  recordLoginFailure(key, start);
  assert.equal(loginThrottleDecision(key, start), "block");
  assert.equal(loginThrottleDecision(key, start + LOGIN_FAILURE_WINDOW_MS), "allow");
  clearLoginFailures(key);
  recordLoginFailure(key, start);
  assert.equal(loginThrottleDecision(key, start), "allow");
  resetLoginThrottle();
});
