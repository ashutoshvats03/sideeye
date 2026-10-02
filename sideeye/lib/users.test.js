// Google sign-in -> app User sync, tested against the real Postgres.
//
// These cover the Plan 02 Review Focus items that would otherwise need a live OAuth
// click-through:
//   - double-clicking sign-in creates exactly ONE User row
//   - a deactivated (isActive=false) user is refused even with a valid Google session
//   - the first admin is promoted from ADMIN_EMAIL
//
// Each test uses a unique email and the suite cleans up after itself, so it is safe to
// re-run against a database that already has real data.

import { test, expect, afterAll } from "bun:test";
import { prisma } from "./prisma.js";
import { syncUserFromOAuth, adminEmailFromEnv, isAdminRole } from "./users.js";

const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createdEmails = [];

function testEmail(label) {
  const email = `sideeye-test-${label}-${RUN}@example.invalid`;
  createdEmails.push(email);
  return email;
}

afterAll(async () => {
  // Address, UserCoupon and Review cascade off User; Order does NOT (order history must
  // outlive the account row), so this only works because these tests create no orders.
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  await prisma.$disconnect();
});

test("first sign-in creates exactly one active customer row", async () => {
  const email = testEmail("first");

  const result = await syncUserFromOAuth({ email, name: "Test Person", image: "/a.png" });

  expect(result.ok).toBe(true);
  expect(result.user.email).toBe(email);
  expect(result.user.role).toBe("customer");
  expect(result.user.isActive).toBe(true);
  expect(result.user.lastLoginAt).toBeInstanceOf(Date);

  const rows = await prisma.user.findMany({ where: { email } });
  expect(rows).toHaveLength(1);
});

test("double sign-in does NOT create a second User row", async () => {
  const email = testEmail("double");

  const first = await syncUserFromOAuth({ email, name: "First" });
  const firstLoginAt = first.user.lastLoginAt;

  const later = new Date(firstLoginAt.getTime() + 60_000);
  const second = await syncUserFromOAuth({ email, name: "Second" }, { now: later });

  expect(second.ok).toBe(true);
  expect(second.user.id).toBe(first.user.id); // same row, updated
  expect(second.user.lastLoginAt.getTime()).toBe(later.getTime()); // bumped

  const rows = await prisma.user.findMany({ where: { email } });
  expect(rows).toHaveLength(1);
});

test("email matching is case-insensitive and whitespace-tolerant", async () => {
  const email = testEmail("case");

  const first = await syncUserFromOAuth({ email: email.toUpperCase() });
  expect(first.ok).toBe(true);

  const second = await syncUserFromOAuth({ email: `  ${email.toLowerCase()}  ` });
  expect(second.ok).toBe(true);
  expect(second.user.id).toBe(first.user.id);

  const rows = await prisma.user.findMany({ where: { email } });
  expect(rows).toHaveLength(1);
});

test("a deactivated user is refused and stays deactivated", async () => {
  const email = testEmail("inactive");

  const created = await syncUserFromOAuth({ email, name: "Banned" });
  expect(created.ok).toBe(true);

  await prisma.user.update({
    where: { id: created.user.id },
    data: { isActive: false },
  });

  // Valid Google session, deactivated account: must be denied.
  const attempt = await syncUserFromOAuth({ email, name: "Banned" });
  expect(attempt.ok).toBe(false);
  expect(attempt.reason).toBe("inactive");

  // A refused sign-in must not silently reactivate the row.
  const row = await prisma.user.findUnique({ where: { email } });
  expect(row.isActive).toBe(false);
});

test("ADMIN_EMAIL promotes the first admin, and only that email", async () => {
  const adminEmail = testEmail("admin");
  const customerEmail = testEmail("plain");

  const admin = await syncUserFromOAuth({ email: adminEmail }, { adminEmail });
  expect(admin.ok).toBe(true);
  expect(admin.user.role).toBe("admin");

  const customer = await syncUserFromOAuth({ email: customerEmail }, { adminEmail });
  expect(customer.user.role).toBe("customer");
});

test("admin promotion is idempotent and never demotes", async () => {
  const adminEmail = testEmail("adminidem");

  const first = await syncUserFromOAuth({ email: adminEmail }, { adminEmail });
  expect(first.user.role).toBe("admin");

  const second = await syncUserFromOAuth({ email: adminEmail }, { adminEmail });
  expect(second.user.role).toBe("admin");
  expect(second.user.id).toBe(first.user.id);
});

test("no ADMIN_EMAIL means nobody is auto-promoted", async () => {
  const email = testEmail("noadmin");

  const result = await syncUserFromOAuth({ email }, { adminEmail: "" });
  expect(result.user.role).toBe("customer");
});

test("a missing email is refused and creates no row", async () => {
  const missing = await syncUserFromOAuth({ name: "No Email" });
  expect(missing.ok).toBe(false);
  expect(missing.reason).toBe("missing_email");

  const blank = await syncUserFromOAuth({ email: "   " });
  expect(blank.ok).toBe(false);
  expect(blank.reason).toBe("missing_email");
});

test("absent name/image never wipes a known value", async () => {
  const email = testEmail("sparse");

  await syncUserFromOAuth({ email, name: "Real Name", image: "/brand/logo.png" });
  const second = await syncUserFromOAuth({ email });

  expect(second.user.name).toBe("Real Name");
  expect(second.user.avatar).toBe("/brand/logo.png");
});

// --- pure helpers ---

test("adminEmailFromEnv normalises and tolerates unset", () => {
  expect(adminEmailFromEnv({ ADMIN_EMAIL: "  Me@Example.COM " })).toBe("me@example.com");
  expect(adminEmailFromEnv({})).toBe("");
  expect(adminEmailFromEnv({ ADMIN_EMAIL: "" })).toBe("");
});

test("isAdminRole accepts either casing (spec says admin, plan said ADMIN)", () => {
  expect(isAdminRole("admin")).toBe(true);
  expect(isAdminRole("ADMIN")).toBe(true);
  expect(isAdminRole("Admin")).toBe(true);
  expect(isAdminRole(" admin ")).toBe(true);
  expect(isAdminRole("customer")).toBe(false);
  expect(isAdminRole("superadmin")).toBe(false);
  expect(isAdminRole("")).toBe(false);
  expect(isAdminRole(null)).toBe(false);
  expect(isAdminRole(undefined)).toBe(false);
});
