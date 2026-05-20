/**
 * Typed wrapper around `chrome.runtime.sendMessage`.
 *
 * Same surface used by the popup, the options page and the content-script
 * badge — anything that talks to the background message router goes through
 * this helper so the type narrowing is centralised.
 */
import type { ErrorResponse, Request, Response as MessageResponse } from "./messages.js";

export class BackgroundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackgroundError";
  }
}

export async function send<T extends Request>(request: T): Promise<MessageResponse<T>> {
  const raw = (await chrome.runtime.sendMessage(request)) as
    | MessageResponse<T>
    | ErrorResponse
    | undefined;
  if (raw === undefined) {
    throw new BackgroundError("no response from background");
  }
  if (raw.ok === false) {
    throw new BackgroundError(raw.error);
  }
  return raw;
}
