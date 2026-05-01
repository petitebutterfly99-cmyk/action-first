const LOVABLE_PREVIEW_TOKEN_PARAM = "__lovable_token";
const LOVABLE_PREVIEW_TOKEN_STORAGE_KEY = "retainiq.lovable_preview_token";

function getTokenFromUrl() {
  return new URLSearchParams(window.location.search).get(LOVABLE_PREVIEW_TOKEN_PARAM);
}

export function persistLovablePreviewToken() {
  if (typeof window === "undefined") return;

  const token = getTokenFromUrl();
  if (token) {
    window.sessionStorage.setItem(LOVABLE_PREVIEW_TOKEN_STORAGE_KEY, token);
  }
}

export function appendLovablePreviewToken(url: URL) {
  if (typeof window === "undefined") return url;
  if (!window.location.hostname.endsWith(".lovableproject.com")) return url;

  const token =
    getTokenFromUrl() ?? window.sessionStorage.getItem(LOVABLE_PREVIEW_TOKEN_STORAGE_KEY);

  if (token) {
    url.searchParams.set(LOVABLE_PREVIEW_TOKEN_PARAM, token);
  }

  return url;
}