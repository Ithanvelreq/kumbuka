import { test } from "node:test";
import assert from "node:assert/strict";
import type { PinCrypto } from "../supabase/functions/_shared/domain/ports.ts";
import { login, signup } from "../supabase/functions/_shared/use-cases/auth.ts";
import { MemoryPatients } from "./fakes.ts";

const noop: PinCrypto = { encryptCheck: (id) => `noop:${id}`, verifyPin: () => true };
const strict: PinCrypto = { encryptCheck: (_id, pin) => `pin:${pin}`, verifyPin: (_id, pin, check) => check === `pin:${pin}` };

test("signup stores pin_check (never the PIN) and login works", async () => {
  const patients = new MemoryPatients();
  assert.deepEqual(await signup({ id: "Noor-1", pin: "1234", displayName: "Noor" }, { patients, pinCrypto: noop }), { id: "noor-1", display_name: "Noor" });
  assert.equal(patients.rows.get("noor-1")!.pin_check, "noop:noor-1");
  assert.equal((await login({ id: "noor-1", pin: "9999" }, { patients, pinCrypto: noop })).id, "noor-1");
});

test("duplicate IDs and bad formats are rejected", async () => {
  const patients = new MemoryPatients();
  await signup({ id: "noor", pin: "1234", displayName: null }, { patients, pinCrypto: noop });
  await assert.rejects(signup({ id: "noor", pin: "1234", displayName: null }, { patients, pinCrypto: noop }), /taken/);
  await assert.rejects(signup({ id: "x", pin: "1234", displayName: null }, { patients, pinCrypto: noop }), /ID must/);
  await assert.rejects(signup({ id: "abc", pin: "12", displayName: null }, { patients, pinCrypto: noop }), /PIN must/);
});

test("unknown ID fails login", async () => {
  await assert.rejects(login({ id: "ghost", pin: "1234" }, { patients: new MemoryPatients(), pinCrypto: noop }), /Unknown ID/);
});

test("a real PinCrypto drops in without use-case changes", async () => {
  const patients = new MemoryPatients();
  await signup({ id: "noor", pin: "1234", displayName: null }, { patients, pinCrypto: strict });
  await assert.rejects(login({ id: "noor", pin: "0000" }, { patients, pinCrypto: strict }), /Wrong PIN/);
  assert.equal((await login({ id: "noor", pin: "1234" }, { patients, pinCrypto: strict })).id, "noor");
});
