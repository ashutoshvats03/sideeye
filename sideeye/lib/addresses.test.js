// Ownership-scoped address rules, tested against the real Postgres.
//
// The server actions in `actions/addresses.js` are thin gates (session +
// zod); every database write lives here so the security invariants —
// cross-user refusal, exactly-one-default — are proven by tests, not by
// reading the diff. Every test creates its own users/addresses and the suite
// deletes them, so it is safe to re-run against real data.

import { test, expect, afterAll } from "bun:test";
import { prisma } from "./prisma.js";
import {
  createAddressForUser,
  updateAddressForUser,
  deleteAddressForUser,
  setDefaultAddressForUser,
} from "./addresses.js";

const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createdUserIds = [];

async function makeUser(label) {
  const user = await prisma.user.create({
    data: { email: `sideeye-addr-test-${label}-${RUN}@example.invalid`, name: `Addr ${label}` },
    select: { id: true },
  });
  createdUserIds.push(user.id);
  return user;
}

const VALID = {
  name: "Anaya Sharma",
  phone: "9812345678",
  line1: "14 Linking Road",
  line2: "",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400050",
};

afterAll(async () => {
  await prisma.address.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

test("set-default leaves exactly one default, on the target", async () => {
  const user = await makeUser("default");
  const first = await createAddressForUser(prisma, user.id, { ...VALID, label: "Home" });
  const second = await createAddressForUser(prisma, user.id, { ...VALID, label: "Work" });
  expect(first.ok).toBe(true);
  expect(second.ok).toBe(true);

  const res = await setDefaultAddressForUser(prisma, user.id, second.address.id);
  expect(res.ok).toBe(true);

  const rows = await prisma.address.findMany({
    where: { userId: user.id },
    select: { id: true, isDefault: true },
  });
  expect(rows.filter((r) => r.isDefault).map((r) => r.id)).toEqual([second.address.id]);

  // Moving the default moves it — the old one is cleared in the same transaction.
  await setDefaultAddressForUser(prisma, user.id, first.address.id);
  const again = await prisma.address.findMany({
    where: { userId: user.id },
    select: { id: true, isDefault: true },
  });
  expect(again.filter((r) => r.isDefault).map((r) => r.id)).toEqual([first.address.id]);
});

test("set-default refuses another user's address id and changes nothing", async () => {
  const owner = await makeUser("owner");
  const intruder = await makeUser("intruder");
  const owned = await createAddressForUser(prisma, owner.id, VALID);

  const res = await setDefaultAddressForUser(prisma, intruder.id, owned.address.id);
  expect(res.ok).toBe(false);

  const row = await prisma.address.findUnique({
    where: { id: owned.address.id },
    select: { isDefault: true },
  });
  expect(row.isDefault).toBe(false);
});

test("update edits own fields; delete removes own row; both refuse another user's id", async () => {
  const owner = await makeUser("upd");
  const intruder = await makeUser("upd2");
  const owned = await createAddressForUser(prisma, owner.id, VALID);

  const upd = await updateAddressForUser(prisma, owner.id, owned.address.id, {
    ...VALID,
    city: "Pune",
  });
  expect(upd.ok).toBe(true);
  expect(upd.address.city).toBe("Pune");

  const crossUpd = await updateAddressForUser(prisma, intruder.id, owned.address.id, {
    ...VALID,
    city: "Delhi",
  });
  expect(crossUpd.ok).toBe(false);

  const crossDel = await deleteAddressForUser(prisma, intruder.id, owned.address.id);
  expect(crossDel.ok).toBe(false);
  expect(await prisma.address.findUnique({ where: { id: owned.address.id } })).not.toBeNull();

  const del = await deleteAddressForUser(prisma, owner.id, owned.address.id);
  expect(del.ok).toBe(true);
  expect(await prisma.address.findUnique({ where: { id: owned.address.id } })).toBeNull();
});
