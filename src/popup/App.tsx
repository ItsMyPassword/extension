import { useEffect } from "preact/hooks";
import { AnimatePresence } from "framer-motion";
import { send } from "./api.js";
import { AccountDetailScreen } from "./components/AccountDetailScreen.js";
import { LoadingScreen } from "./components/LoadingScreen.js";
import { MainScreen } from "./components/MainScreen.js";
import { SettingsScreen } from "./components/SettingsScreen.js";
import { SetupScreen } from "./components/SetupScreen.js";
import { SyncScreen } from "./components/SyncScreen.js";
import { UnlockScreen } from "./components/UnlockScreen.js";
import { VaultsScreen } from "./components/VaultsScreen.js";
import { DotGrid } from "../shared/DotGrid.js";
import { errorMessage, fingerprint, hasPin, screen } from "./state.js";
import { loadVaultData } from "./vault.js";
import { installClipboardClearListener } from "./clipboard.js";

export function App() {
  useEffect(() => {
    installClipboardClearListener();
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
    case "account-detail":
      return <AccountDetailScreen key="account-detail" />;
    case "settings":
      return <SettingsScreen key="settings" />;
    case "sync":
      return <SyncScreen key="sync" />;
    case "vaults":
      return <VaultsScreen key="vaults" />;
  }
}

async function bootstrap() {
  try {
    const status = await send({ kind: "status" });
    fingerprint.value = status.fingerprint;

    if (status.isFirstRun) {
      // Still need hasPin for the unlock screen later.
      try {
        const state = await send({ kind: "getState" });
        hasPin.value = state.hasPin;
      } catch {
        hasPin.value = false;
      }
      screen.value = "setup";
      return;
    }

    if (status.locked) {
      hasPin.value = status.hasPin;
      screen.value = "unlock";
      return;
    }

    await loadVaultData();
    screen.value = "main";

    // Fire-and-forget cross-device convergence:
    //   1. Push every local account we know about (idempotent on the
    //      receiver — `applyOp` checks (domain, username) presence)
    //      so anything created before sync existed, or before the
    //      `syncAccountChange` hook ran, finally makes it server-
    //      side.
    //   2. Pull what other devices pushed since we last looked. If
    //      anything new arrived, reload the vault so the user sees
    //      it without re-opening the popup.
    void (async () => {
      try {
        await send({ kind: "syncPushAll" });
      } catch {
        /* bootstrap push best-effort */
      }
      try {
        const r = await send({ kind: "syncPull" });
        if (r.applied !== null && r.applied > 0) {
          await loadVaultData();
        }
      } catch {
        /* offline, locked, no server — silent */
      }
    })();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "could not initialise";
    screen.value = "unlock";
  }
}
