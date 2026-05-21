import { useEffect } from "preact/hooks";
import { AnimatePresence } from "framer-motion";
import { send } from "./api.js";
import { LoadingScreen } from "./components/LoadingScreen.js";
import { MainScreen } from "./components/MainScreen.js";
import { SettingsScreen } from "./components/SettingsScreen.js";
import { SetupScreen } from "./components/SetupScreen.js";
import { UnlockScreen } from "./components/UnlockScreen.js";
import { registrableDomain } from "../shared/domain.js";
import { DotGrid } from "../shared/DotGrid.js";
import {
  activeDomain,
  activeEmail,
  allAccounts,
  errorMessage,
  fingerprint,
  hasPin,
  historyEnabled,
  savedAccounts,
  screen,
} from "./state.js";

export function App() {
  useEffect(() => {
    void bootstrap();
  }, []);

  return (
    <>
      <DotGrid />
      <div class="relative z-10">
        <AnimatePresence mode="wait" initial={false}>
          {renderScreen()}
        </AnimatePresence>
      </div>
    </>
  );
}

function renderScreen() {
  switch (screen.value) {
    case "loading":
      return <LoadingScreen key="loading" />;
    case "setup":
      return <SetupScreen key="setup" />;
    case "unlock":
      return <UnlockScreen key="unlock" hasPin={hasPin.value} />;
    case "main":
      return <MainScreen key="main" />;
    case "settings":
      return <SettingsScreen key="settings" />;
  }
}

async function bootstrap() {
  try {
    const status = await send({ kind: "status" });
    fingerprint.value = status.fingerprint;

    try {
      const state = await send({ kind: "getState" });
      hasPin.value = state.hasPin;
      historyEnabled.value = state.historyEnabled;
    } catch {
      hasPin.value = false;
      historyEnabled.value = false;
    }

    if (status.isFirstRun) {
      screen.value = "setup";
    } else if (status.locked) {
      screen.value = "unlock";
    } else {
      screen.value = "main";
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      activeDomain.value = registrableDomain(tab.url);
    }
    activeEmail.value = "";
    // Best-effort: read the username/email value from the active tab's
    // login form so the generator input arrives pre-filled. Falls back
    // silently on internal pages where executeScript is disallowed.
    if (tab?.id !== undefined && activeDomain.value !== null) {
      try {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const candidates = Array.from(
              document.querySelectorAll<HTMLInputElement>(
                'input[type="email"], input[type="text"], input[type="tel"], input:not([type])',
              ),
            ).filter((el) => el.offsetParent !== null && !el.disabled);
            const hintRe = /user(name)?|login|email|e-?mail/i;
            for (const el of candidates) {
              const hint = (el.getAttribute("autocomplete") ?? "").toLowerCase();
              if (hint === "username" || hint === "email") {
                const v = el.value.trim();
                if (v.length > 0) return v;
              }
            }
            for (const el of candidates) {
              const attrs = [
                el.name,
                el.id,
                el.placeholder,
                el.getAttribute("aria-label") ?? "",
              ].join(" ");
              if (hintRe.test(attrs)) {
                const v = el.value.trim();
                if (v.length > 0) return v;
              }
            }
            return "";
          },
        });
        const detected = result?.result;
        if (typeof detected === "string" && detected.length > 0) {
          activeEmail.value = detected;
        }
      } catch {
        /* swallowed — page not scriptable */
      }
    }
    savedAccounts.value = [];
    allAccounts.value = [];
    if (historyEnabled.value && !status.locked) {
      try {
        const res = await send({ kind: "listAccounts" });
        allAccounts.value = res.entries;
        savedAccounts.value =
          activeDomain.value === null
            ? []
            : res.entries.filter((e) => e.domain === activeDomain.value);
      } catch {
        allAccounts.value = [];
        savedAccounts.value = [];
      }
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "could not initialise";
    screen.value = "unlock";
  }
}
