// /lib/cacheUtils.js — v2025.11A
const CACHE_KEY = "overview_cache";
const MAX_AGE_MS = 1000 * 60 * 30; // 30 menit

export function getCache(sectionKey) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
    const section = cache[sectionKey];
    if (!section) return null;
    const isExpired = Date.now() - section.timestamp > MAX_AGE_MS;
    return isExpired ? null : section;
  } catch {
    return null;
  }
}

export function setCache(sectionKey, payload) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
    cache[sectionKey] = { ...payload, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error("Cache write error:", err);
  }
}

export function clearCache(sectionKey) {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  delete cache[sectionKey];
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
