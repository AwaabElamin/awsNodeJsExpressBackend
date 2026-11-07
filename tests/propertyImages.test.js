const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  MAX_PROPERTY_IMAGES,
  collectImageUrls,
  parseRetainedUrls,
  mergeImageUrls,
} = require("../propertyManagement/services/propertyImages");

test("collectImageUrls prefers the gallery and falls back to the legacy cover", () => {
  assert.deepEqual(
    collectImageUrls({ image_url: "/uploads/old.jpg", image_urls: ["/uploads/a.jpg", "/uploads/b.jpg"] }),
    ["/uploads/a.jpg", "/uploads/b.jpg"]
  );
  assert.deepEqual(collectImageUrls({ image_url: "/uploads/old.jpg", image_urls: [] }), ["/uploads/old.jpg"]);
  assert.deepEqual(collectImageUrls({ image_url: "/uploads/old.jpg" }), ["/uploads/old.jpg"]);
  assert.deepEqual(collectImageUrls({}), []);
});

test("parseRetainedUrls accepts a JSON array, a single URL, or nothing", () => {
  assert.equal(parseRetainedUrls(undefined), null);
  assert.deepEqual(parseRetainedUrls(""), []);
  assert.deepEqual(parseRetainedUrls("[]"), []);
  assert.deepEqual(parseRetainedUrls('["/uploads/a.jpg","/uploads/b.jpg"]'), ["/uploads/a.jpg", "/uploads/b.jpg"]);
  assert.deepEqual(parseRetainedUrls("/uploads/a.jpg"), ["/uploads/a.jpg"]);
  assert.deepEqual(parseRetainedUrls('{"not":"an array"}'), []);
});

test("mergeImageUrls keeps client order, appends uploads, dedupes, and rejects unsafe values", () => {
  const files = [{ filename: "prop-1.jpg" }, { filename: "prop-2.png" }];
  assert.deepEqual(
    mergeImageUrls(["/uploads/b.jpg", " /uploads/a.jpg ", "/uploads/b.jpg", "javascript:alert(1)", 42, "ftp://x/y.jpg"], files),
    ["/uploads/b.jpg", "/uploads/a.jpg", "/uploads/prop-1.jpg", "/uploads/prop-2.png"]
  );
  assert.deepEqual(mergeImageUrls(["https://images.example.invalid/x.jpg"], []), ["https://images.example.invalid/x.jpg"]);
  assert.deepEqual(mergeImageUrls(null, []), []);
});

test("mergeImageUrls caps the gallery at the maximum size", () => {
  const retained = Array.from({ length: MAX_PROPERTY_IMAGES }, (_, i) => `/uploads/r-${i}.jpg`);
  const merged = mergeImageUrls(retained, [{ filename: "extra.jpg" }]);
  assert.equal(merged.length, MAX_PROPERTY_IMAGES);
  assert.equal(merged.includes("/uploads/extra.jpg"), false);
});
