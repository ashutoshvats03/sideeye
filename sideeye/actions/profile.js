"use server";

/**
 * Customer profile action.
 *
 * Thin gate (session + zod) over a Prisma update. DOB is PII: never logged,
 * never required to order, not surfaced in admin beyond a label.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "../lib/prisma.js";
import { getCurrentUser } from "../lib/guards.js";
import { validateProfileInput } from "../lib/profile-input.js";

const updateProfileSchema = z.object({
  name: z.unknown(),
  dob: z.unknown(),
  phone: z.unknown(),
});

/**
 * Update the signed-in user's name, date of birth and phone.
 * Email is read-only — it is the Google identity.
 */
export async function updateProfile(input) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid profile." };
  const checked = validateProfileInput(parsed.data);
  if (!checked.ok) return { ok: false, error: checked.error };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: checked.data.name,
      // Stored at UTC midnight so the date renders identically everywhere.
      dateOfBirth: checked.data.dob ? new Date(`${checked.data.dob}T00:00:00Z`) : null,
      phone: checked.data.phone ?? null,
    },
  });

  revalidatePath("/account");
  return { ok: true };
}
