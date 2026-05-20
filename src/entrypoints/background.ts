/**
 * Background service worker entrypoint.
 *
 * Wires the message router to chrome.runtime.onMessage and registers the
 * auto-lock alarm handler. All logic lives in `../background/*` so it stays
 * testable without instantiating a chrome runtime.
 */
import { defineBackground } from "wxt/utils/define-background";
import { handleRequest } from "../background/router.js";
import { hardenSessionStorage, registerAutoLockHandler } from "../background/session.js";
import { isRequest } from "../shared/messages.js";

export default defineBackground(() => {
  void hardenSessionStorage();
  registerAutoLockHandler();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isRequest(message)) {
      sendResponse({ ok: false, error: "invalid request" });
      return false;
    }
    // Returning true keeps the message channel open for the async response.
    handleRequest(message).then(sendResponse, (error: unknown) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });
    return true;
  });
});
