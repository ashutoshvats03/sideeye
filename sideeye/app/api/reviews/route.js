import { getCurrentUser } from "../../../lib/guards.js";
import prisma from "../../../lib/prisma.js";
import { parseReviewInput } from "../../../lib/review-input.js";

/**
 * POST /api/reviews — a signed-in shopper submits a review for a product.
 *
 * Security properties this route owns:
 *  - `getCurrentUser()` re-reads the User from the database, so a deactivated account cannot
 *    post even with a still-valid session cookie.
 *  - `userId` comes from the session, never from the request body, so a shopper cannot
 *    write a review as somebody else.
 *  - `isApproved` is hard-coded `false` and is not a validated field, so no client can
 *    publish its own review (see `reviewSchema.strip()` in lib/review-input.js).
 *  - The product is re-checked as ACTIVE before the insert, so reviews cannot be attached
 *    to a deactivated product and cannot probe ids for existence.
 *  - Prisma's unique constraint on [productId, userId] is the real duplicate guard; P2002
 *    is translated to 409 rather than a 500.
 *
 * Reviews are never returned to the caller in the response body: an unapproved review must
 * not be readable by anyone except an admin.
 *
 * NOTE: this uses `getCurrentUser()`, not `requireUser()`. `requireUser()` calls
 * `redirect()`, which throws NEXT_REDIRECT — correct in a page, wrong in a route handler,
 * where 401 is the honest answer for "you are not signed in".
 */

/** Reject oversized bodies before spending anything on JSON parsing. */
const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "Please sign in before reviewing." },
      { status: 401 },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return Response.json({ error: "That review is too long." }, { status: 413 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "We could not read that." }, { status: 400 });
  }

  const parsed = parseReviewInput(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { productId, rating, text } = parsed.value;

  // Existence is a database question, never a schema question. `isActive` is checked here
  // so a review cannot be attached to a deactivated product.
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true },
  });
  if (!product) {
    return Response.json({ error: "That piece is not available." }, { status: 404 });
  }

  try {
    const review = await prisma.review.create({
      data: {
        productId,
        userId: user.id,
        rating,
        text: text || null,
        // Never taken from the client. Reviews appear once an admin approves them.
        isApproved: false,
      },
      select: { id: true, rating: true, isApproved: true },
    });

    return Response.json(
      {
        ok: true,
        message: "Thanks! Your review is waiting for approval.",
        reviewId: review.id,
        isApproved: review.isApproved,
      },
      { status: 201 },
    );
  } catch (error) {
    // Prisma unique-constraint violation on Review(productId, userId): one review per
    // shopper per product, enforced by the database rather than by a read-then-write race.
    if (error?.code === "P2002") {
      return Response.json(
        { error: "You have already reviewed this piece." },
        { status: 409 },
      );
    }
    console.error("review create failed", { code: error?.code });
    return Response.json(
      { error: "We could not save that review. Try again." },
      { status: 500 },
    );
  }
}
