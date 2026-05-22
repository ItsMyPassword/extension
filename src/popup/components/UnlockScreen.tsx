import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { AnimatePresence, motion } from "framer-motion";
import { send } from "../api.js";
import { Header } from "./Header.js";
import { t } from "../../shared/i18n.js";
import { POP_IN, SOFT_SPRING, TAP_SCALE } from "../../shared/motion.js";
import { busy, errorMessage, fingerprint, livePreview, screen } from "../state.js";
import { loadVaultData } from "../vault.js";

type Mode = "master" | "pin";

interface Props {
  hasPin: boolean;
}

export function UnlockScreen({ hasPin }: Props) {
  const [mode, setMode] = useState<Mode>(hasPin ? "pin" : "master");
  const [master, setMaster] = useState("");
  const [pin, setPin] = useState("");
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode !== "master") {
      livePreview.value = null;
      return;
    }
    if (previewTimer.current !== null) clearTimeout(previewTimer.current);
    if (master.length === 0) {
      livePreview.value = null;
      return;
    }
    previewTimer.current = setTimeout(() => {
      void send({ kind: "fingerprint", master }).then(
        (response) => {
          livePreview.value = response.fingerprint;
        },
        () => {
          livePreview.value = null;
        },
      );
    }, 500);
    return () => {
      if (previewTimer.current !== null) clearTimeout(previewTimer.current);
    };
  }, [master, mode]);

  const submitMaster = useCallback(
    async (event: Event) => {
      event.preventDefault();
      errorMessage.value = null;
      busy.value = true;
      try {
        const response = await send({ kind: "unlock", master });
        fingerprint.value = response.fingerprint;
        await loadVaultData();
        screen.value = "main";
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : t("unlock_incorrect");
      } finally {
        busy.value = false;
      }
    },
    [master],
  );

  const submitPin = useCallback(
    async (event: Event) => {
      event.preventDefault();
      errorMessage.value = null;
      busy.value = true;
      try {
        const response = await send({ kind: "unlockWithPin", pin });
        fingerprint.value = response.fingerprint;
        await loadVaultData();
        screen.value = "main";
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : t("unlock_incorrect_pin");
      } finally {
        busy.value = false;
      }
    },
    [pin],
  );

  const expected = fingerprint.value;

  return (
    <motion.div
      class="flex flex-col gap-4 p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SOFT_SPRING}
    >
      <Header subtitle={t("unlock_title")} fingerprint={fingerprint.value} />

      {expected !== null ? (
        <motion.div
          class="flex flex-col gap-2 items-start p-4 rounded-[10px] bg-(--color-surface-sunken) border border-(--color-line)"
          variants={POP_IN}
          initial="initial"
          animate="animate"
        >
          <span class="field-label">{t("unlock_expected_label")}</span>
          <span class="fingerprint">{expected}</span>
        </motion.div>
      ) : null}

      {hasPin ? (
        <div class="segmented grid-cols-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-pressed={mode === "pin"}
            onClick={() => setMode("pin")}
          >
            {t("unlock_pin_tab")}
          </button>
          <button
            type="button"
            role="tab"
            aria-pressed={mode === "master"}
            onClick={() => setMode("master")}
          >
            {t("unlock_master_tab")}
          </button>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {mode === "master" ? (
          <motion.form
            key="master"
            class="flex flex-col gap-4"
            onSubmit={submitMaster}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0, transition: SOFT_SPRING }}
            exit={{ opacity: 0, x: -8, transition: { duration: 0.12 } }}
          >
            <label class="flex flex-col gap-2">
              <span class="field-label">{t("setup_master_label")}</span>
              <input
                class="input"
                type="password"
                value={master}
                autocomplete="current-password"
                autoFocus
                required
                onInput={(e) => setMaster((e.target as HTMLInputElement).value)}
              />
            </label>

            <AnimatePresence>
              {livePreview.value !== null && livePreview.value !== expected ? (
                <motion.div
                  key="typed"
                  class="flex flex-col gap-2 items-start p-4 rounded-[10px] bg-amber-500/8 border border-amber-500/30"
                  variants={POP_IN}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <span class="field-label">{t("unlock_typed_label")}</span>
                  <span class="fingerprint">{livePreview.value}</span>
                  <span class="field-hint">{t("unlock_mismatch_hint")}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {errorMessage.value !== null ? (
              <div class="field-error" role="alert">
                {errorMessage.value}
              </div>
            ) : null}

            <motion.button type="submit" class="btn" whileTap={TAP_SCALE} disabled={busy.value}>
              {busy.value ? t("unlock_unlocking") : t("common_unlock")}
            </motion.button>
          </motion.form>
        ) : (
          <motion.form
            key="pin"
            class="flex flex-col gap-4"
            onSubmit={submitPin}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0, transition: SOFT_SPRING }}
            exit={{ opacity: 0, x: 8, transition: { duration: 0.12 } }}
          >
            <label class="flex flex-col gap-2">
              <span class="field-label">{t("unlock_pin_label")}</span>
              <input
                class="input input-mono tracking-widest text-center"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                minLength={4}
                maxLength={6}
                value={pin}
                autoFocus
                required
                onInput={(e) => setPin((e.target as HTMLInputElement).value.replace(/\D/g, ""))}
              />
            </label>

            {errorMessage.value !== null ? (
              <div class="field-error" role="alert">
                {errorMessage.value}
              </div>
            ) : null}

            <motion.button
              type="submit"
              class="btn"
              whileTap={TAP_SCALE}
              disabled={busy.value || pin.length < 4}
            >
              {busy.value ? t("unlock_unlocking") : t("common_unlock")}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
