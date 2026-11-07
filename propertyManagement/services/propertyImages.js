const MAX_PROPERTY_IMAGES = 10;

// Returns the ordered photo list for a property, falling back to the legacy
// single image_url for documents created before galleries existed.
const collectImageUrls = (property) => {
  const urls = Array.isArray(property.image_urls)
    ? property.image_urls.filter((url) => typeof url === "string" && url.trim())
    : [];
  if (urls.length > 0) return urls;
  return property.image_url ? [property.image_url] : [];
};

// Parses the retained-URL list sent by the client (JSON array or single URL).
// Returns null when the client did not send the field at all.
const parseRetainedUrls = (raw) => {
  if (raw === undefined || raw === null) return null;
  if (Array.isArray(raw)) return raw;
  const text = String(raw).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [text];
  }
};

const uploadedFileUrls = (files) =>
  (Array.isArray(files) ? files : []).map((file) => `/uploads/${file.filename}`);

// Builds the final gallery: retained URLs first (in client order), then new
// uploads. Only relative upload paths or http(s) URLs are accepted.
const mergeImageUrls = (retained, files) => {
  const seen = new Set();
  const result = [];
  for (const url of [...(retained || []), ...uploadedFileUrls(files)]) {
    if (typeof url !== "string") continue;
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    if (!/^(\/uploads\/|https?:\/\/)/i.test(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= MAX_PROPERTY_IMAGES) break;
  }
  return result;
};

module.exports = {
  MAX_PROPERTY_IMAGES,
  collectImageUrls,
  parseRetainedUrls,
  mergeImageUrls,
};
