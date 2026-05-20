/**
 * Domain normalisation.
 *
 * The extension uses the **registrable** domain (the smallest unit that a
 * single party can register at a registrar) as part of the derivation salt,
 * so that all subdomains of one service share the same generated password.
 *
 * We delegate to `tldts`, which ships the Mozilla Public Suffix List and is
 * dependency-free and audit-friendly.
 */
import { getDomain } from "tldts";

/**
 * Extract the registrable domain from a URL or hostname.
 *
 * Returns `null` for inputs that don't resolve to a public registrable
 * domain — typically `chrome://`, `file://`, IP literals or `localhost`. The
 * caller should fall back to a UI that asks the user what to do.
 *
 * Examples:
 *   "https://accounts.google.com/signin" → "google.com"
 *   "https://www.example.co.uk"          → "example.co.uk"
 *   "chrome://extensions"                → null
 *   "http://localhost:3000"              → null
 */
export function registrableDomain(input: string): string | null {
  if (typeof input !== "string" || input.length === 0) {
    return null;
  }
  const domain = getDomain(input, { allowPrivateDomains: false });
  return domain && domain.length > 0 ? domain.toLowerCase() : null;
}
