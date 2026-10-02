import { test, expect, beforeEach, afterEach } from "bun:test";
import {
  CART_STORAGE_KEY,
  CART_CHANGED_EVENT,
  readCart,
  writeCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
} from "./cart-storage.js";

/**
 * Minimal localStorage stand-in. `lib/cart-storage.js` is the only place that touches
 * storage, so faking the whole browser surface here is enough to test the seam where a
 * silently-broken cart would otherwise hide.
 */
function makeStorage({ throwOnWrite = false, throwOnRead = false } = {}) {
  const map = new Map();
  return {
    getItem(key) {
      if (throwOnRead) throw new Error("storage disabled");
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      if (throwOnWrite) throw new Error("QuotaExceededError");
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
    raw: map,
  };
}

let store;
let events;

beforeEach(() => {
  store = makeStorage();
  events = [];
  globalThis.window = {
    localStorage: store,
    dispatchEvent(event) {
      events.push(event.type);
      return true;
    },
  };
  globalThis.CustomEvent = class {
    constructor(type) {
      this.type = type;
    }
  };
});

afterEach(() => {
  delete globalThis.window;
  delete globalThis.CustomEvent;
});

test("an empty store reads as an empty cart", () => {
  expect(readCart()).toEqual([]);
});

test("a stored cart round-trips as [{slug, qty}]", () => {
  store.setItem(CART_STORAGE_KEY, '[{"slug":"ruby-ember-ring","qty":2}]');
  expect(readCart()).toEqual([{ slug: "ruby-ember-ring", qty: 2 }]);
});

test("stored JSON holds only slug and qty, never price or name", () => {
  addItem("ruby-ember-ring", 2);
  const stored = JSON.parse(store.raw.get(CART_STORAGE_KEY));
  expect(Object.keys(stored[0]).sort()).toEqual(["qty", "slug"]);
});

test("junk in localStorage reads as an empty cart instead of throwing", () => {
  for (const junk of ["", "not json", "{}", '"a string"', "[null,1,{}]", "[{\"slug\":\"../admin\",\"qty\":1}]"]) {
    store.setItem(CART_STORAGE_KEY, junk);
    expect(readCart()).toEqual([]);
  }
});

test("addItem merges into an existing line instead of duplicating it", () => {
  addItem("ruby-ember-ring", 1);
  const cart = addItem("ruby-ember-ring", 2);
  expect(cart).toEqual([{ slug: "ruby-ember-ring", qty: 3 }]);
});

test("addItem caps the line at available stock", () => {
  addItem("ruby-ember-ring", 3, { maxQty: 4 });
  expect(addItem("ruby-ember-ring", 5, { maxQty: 4 })).toEqual([
    { slug: "ruby-ember-ring", qty: 4 },
  ]);
});

test("addItem with zero stock stores nothing", () => {
  expect(addItem("ruby-ember-ring", 2, { maxQty: 0 })).toEqual([]);
  expect(readCart()).toEqual([]);
});

test("updateItem with zero stock drops the line", () => {
  addItem("ruby-ember-ring", 2);
  expect(updateItem("ruby-ember-ring", 5, { maxQty: 0 })).toEqual([]);
  expect(readCart()).toEqual([]);
});

test("updateItem sets an absolute quantity", () => {
  addItem("ruby-ember-ring", 5);
  expect(updateItem("ruby-ember-ring", 2)).toEqual([
    { slug: "ruby-ember-ring", qty: 2 },
  ]);
});

test("removeItem drops the line", () => {
  addItem("ruby-ember-ring", 2);
  addItem("prism-line-bracelet", 1);
  expect(removeItem("ruby-ember-ring")).toEqual([
    { slug: "prism-line-bracelet", qty: 1 },
  ]);
});

test("clearCart empties storage", () => {
  addItem("ruby-ember-ring", 2);
  clearCart();
  expect(readCart()).toEqual([]);
  expect(JSON.parse(store.raw.get(CART_STORAGE_KEY))).toEqual([]);
});

test("every mutation announces itself so the header badge can react", () => {
  addItem("ruby-ember-ring", 1);
  updateItem("ruby-ember-ring", 2);
  removeItem("ruby-ember-ring");
  clearCart();
  expect(events).toEqual([
    CART_CHANGED_EVENT,
    CART_CHANGED_EVENT,
    CART_CHANGED_EVENT,
    CART_CHANGED_EVENT,
  ]);
});

test("a read does not announce a change", () => {
  readCart();
  expect(events).toEqual([]);
});

test("storage that throws on write degrades to an in-memory cart, not a crash", () => {
  const broken = makeStorage({ throwOnWrite: true });
  globalThis.window.localStorage = broken;
  expect(() => addItem("ruby-ember-ring", 1)).not.toThrow();
  expect(readCart()).toEqual([]);
});

test("storage that throws on read degrades to an empty cart, not a crash", () => {
  globalThis.window.localStorage = makeStorage({ throwOnRead: true });
  expect(readCart()).toEqual([]);
  expect(addItem("ruby-ember-ring", 1)).toEqual([
    { slug: "ruby-ember-ring", qty: 1 },
  ]);
});

test("with no window at all the cart stays empty and never throws", () => {
  delete globalThis.window;
  expect(readCart()).toEqual([]);
  expect(() => addItem("ruby-ember-ring", 1)).not.toThrow();
});