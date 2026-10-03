/**
 * Pure coupon-form conversions, shared by the admin coupon manager.
 *
 * Rupees ↔ integer-paise conversion lives here (not inline in the component)
 * so the FLAT-value unit boundary is covered by tests: the admin types rupees,
 * the pricing engine stores integer paise. `couponToForm` is the inverse used
 * to prefill the edit form.
 */

/** "999.50" → 99950. Returns null for blank, NaN for malformed. */
export function rupeesToPaise(raw) {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  const m = s.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return NaN;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** 99950 → "999.50". Blank for nullish. */
export function paiseToRupees(paise) {
  if (paise == null) return "";
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
}

/** Fresh blank string-valued coupon form state. */
export function emptyCouponForm() {
  return {
    code: "",
    type: "PERCENT",
    value: "20",
    minOrder: "999.00",
    maxDiscount: "",
    usageLimit: "",
    perUserLimit: "1",
    isActive: true,
  };
}

/**
 * Convert the string-valued admin form into a server-action payload.
 * PERCENT values pass through untouched; FLAT values are rupees the admin
 * typed and become integer paise.
 *
 * @param {object} form string-valued form state
 * @returns {{ data: object } | { error: string }}
 */
export function couponFormToPayload(form) {
  const value =
    form.type === "FLAT" ? rupeesToPaise(form.value) : Number(form.value);
  if (!Number.isInteger(value)) {
    return {
      error:
        form.type === "FLAT"
          ? "Amount must look like 50.00."
          : "Percent must be a whole number.",
    };
  }
  const minOrderPaise = rupeesToPaise(form.minOrder) ?? 0;
  if (!Number.isInteger(minOrderPaise)) {
    return { error: "Minimum order must look like 999.00." };
  }
  const maxDiscountPaise =
    String(form.maxDiscount ?? "").trim() === "" ? null : rupeesToPaise(form.maxDiscount);
  if (maxDiscountPaise !== null && !Number.isInteger(maxDiscountPaise)) {
    return { error: "Max discount must look like 500.00 or be blank." };
  }
  const usageLimit =
    String(form.usageLimit ?? "").trim() === "" ? null : Number(form.usageLimit);
  const perUserLimit =
    String(form.perUserLimit ?? "").trim() === "" ? null : Number(form.perUserLimit);
  return {
    data: {
      type: form.type,
      value,
      minOrderPaise,
      maxDiscountPaise,
      usageLimit,
      perUserLimit,
      isActive: form.isActive,
    },
  };
}

/**
 * Convert a stored coupon back into string-valued form state for editing.
 * FLAT values are paise in the DB and become rupees on screen.
 *
 * @param {object} coupon coupon record with paise fields
 * @returns {object} string-valued form state
 */
export function couponToForm(coupon) {
  const base = emptyCouponForm();
  return {
    ...base,
    code: coupon.code,
    type: coupon.type,
    value: coupon.type === "FLAT" ? paiseToRupees(coupon.value) : String(coupon.value),
    minOrder: paiseToRupees(coupon.minOrderPaise),
    maxDiscount:
      coupon.maxDiscountPaise == null ? "" : paiseToRupees(coupon.maxDiscountPaise),
    usageLimit: coupon.usageLimit == null ? "" : String(coupon.usageLimit),
    perUserLimit: coupon.perUserLimit == null ? "" : String(coupon.perUserLimit),
    isActive: coupon.isActive,
  };
}
