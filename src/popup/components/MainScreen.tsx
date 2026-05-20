import { useCallback, useEffect, useState } from "preact/hooks";
import { AnimatePresence, motion } from "framer-motion";
import { send } from "../api.js";
import { Header } from "./Header.js";
import {
  IconCheck,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconLock,
  IconSettings,
} from "../../shared/icons.js";
import { t } from "../../shared/i18n.js";
import { POP_IN, SOFT_SPRING, TAP_SCALE } from "../../shared/motion.js";
import {
  activeDomain,
  activeEmail,
  busy,
  canGenerate,
  errorMessage,
  fingerprint,
  generated,
  screen,
} from "../state.js";

export function MainScreen() {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generated.value = null;
    setRevealed(false);
    setCopied(false);
  }, [activeDomain.value, activeEmail.value]);

  const generate = useCallback(async () => {
    if (activeDomain.value === null) return;
    errorMessage.value = null;
    busy.value = true;
    try {
      const response = await send({
        kind: "generate",
        domain: activeDomain.value,
        email: activeEmail.value.trim(),
      });
      generated.value = response.password;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "generation failed";
    } finally {
      busy.value = false;
    }
  }, []);

  const copy = useCallback(async () => {
    if (generated.value === null) return;
    try {
      await navigator.clipboard.writeText(generated.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // swallowed — clipboard API may be unavailable
    }
  }, []);

  const onLock = useCallback(async () => {
    await send({ kind: "lock" });
    generated.value = null;
    screen.value = "unlock";
  }, []);

  const onSettings = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  return (
    <motion.div
      class="flex flex-col gap-4 p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SOFT_SPRING}
    >
      <Header
        subtitle={activeDomain.value ?? undefined}
        fingerprint={fingerprint.value}
        actions={
          <>
            <motion.button
              type="button"
              class="btn btn-quiet btn-icon"
              whileTap={TAP_SCALE}
              onClick={onSettings}
              aria-label={t("common_settings")}
            >
              <IconSettings />
            </motion.button>
            <motion.button
              type="button"
              class="btn btn-quiet btn-icon"
              whileTap={TAP_SCALE}
              onClick={onLock}
              aria-label={t("common_lock")}
            >
              <IconLock />
            </motion.button>
          </>
        }
      />

      {activeDomain.value === null ? (
        <p class="text-(--color-ink-muted) text-sm leading-relaxed">{t("main_no_site")}</p>
      ) : (
        <>
          <label class="flex flex-col gap-2">
            <span class="field-label">{t("main_username_label")}</span>
            <input
              class="input"
              type="text"
              value={activeEmail.value}
              autocomplete="off"
              placeholder={t("main_username_placeholder")}
              onInput={(e) => {
                activeEmail.value = (e.target as HTMLInputElement).value;
              }}
            />
          </label>

          <motion.button
            type="button"
            class="btn"
            whileTap={TAP_SCALE}
            onClick={generate}
            disabled={busy.value || !canGenerate.value}
          >
            {busy.value ? t("common_generating") : t("common_generate")}
          </motion.button>

          <AnimatePresence>
            {generated.value !== null ? (
              <motion.div
                key="generated"
                class="flex flex-col gap-3 p-4 rounded-[10px] bg-(--color-surface-sunken) border border-(--color-line)"
                variants={POP_IN}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
              >
                <code
                  class={
                    revealed
                      ? "font-mono text-sm break-all select-all cursor-text text-(--color-ink) min-h-5"
                      : "font-mono text-sm break-all select-all cursor-text text-(--color-ink-muted) min-h-5 tracking-[0.15em]"
                  }
                >
                  {revealed ? generated.value : "•".repeat(Math.min(generated.value.length, 24))}
                </code>
                <div class="flex gap-2">
                  <motion.button
                    type="button"
                    class="btn btn-ghost btn-sm flex-1"
                    whileTap={TAP_SCALE}
                    onClick={() => setRevealed((v) => !v)}
                  >
                    {revealed ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    {revealed ? t("common_hide") : t("common_reveal")}
                  </motion.button>
                  <motion.button
                    type="button"
                    class="btn btn-ghost btn-sm flex-1"
                    whileTap={TAP_SCALE}
                    onClick={copy}
                  >
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    {copied ? t("common_copied") : t("common_copy")}
                  </motion.button>
                </div>
              </motion.div>
            ) : !canGenerate.value ? (
              <p class="field-hint">{t("main_no_email")}</p>
            ) : null}
          </AnimatePresence>

          {errorMessage.value !== null ? (
            <div class="field-error" role="alert">
              {errorMessage.value}
            </div>
          ) : null}
        </>
      )}
    </motion.div>
  );
}
