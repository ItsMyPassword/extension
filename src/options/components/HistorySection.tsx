import { useState } from "preact/hooks";
import { motion } from "framer-motion";
import { send } from "../api.js";
import { t } from "../../shared/i18n.js";
import { SOFT_SPRING, TAP_SCALE } from "../../shared/motion.js";

interface Props {
  enabled: boolean;
  hasEntries: boolean;
  onChange: () => Promise<void> | void;
}

export function HistorySection({ enabled, hasEntries, onChange }: Props) {
  const [confirming, setConfirming] = useState(false);

  const toggle = async (next: boolean) => {
    if (next === false && hasEntries) {
      setConfirming(true);
      return;
    }
    await send({ kind: "setHistoryEnabled", enabled: next });
    await onChange();
  };

  return (
    <motion.section
      class="flex flex-col gap-4"
      variants={{
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0, transition: SOFT_SPRING },
      }}
    >
      <div class="flex items-baseline justify-between gap-3">
        <div class="flex flex-col gap-0.5 flex-1 min-w-0">
          <h2 class="m-0 text-base font-semibold tracking-[-0.015em] text-(--color-ink)">
            {t("history_section_title")}
          </h2>
          <span class="text-xs text-(--color-ink-muted) leading-snug">
            {t("history_section_hint")}
          </span>
        </div>
      </div>
      <div class="card p-5 flex-row items-center justify-between gap-4">
        <span class="text-sm text-(--color-ink)">{t("history_toggle_label")}</span>
        <label class="switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => void toggle((e.target as HTMLInputElement).checked)}
          />
          <span class="switch-track" />
          <span class="switch-thumb" />
        </label>
      </div>

      {confirming ? (
        <div class="callout callout-danger flex-col gap-3" role="alertdialog">
          <div class="flex flex-col gap-1">
            <strong>{t("history_disable_confirm_title")}</strong>
            <span>{t("history_disable_confirm_body")}</span>
          </div>
          <div class="flex gap-2">
            <motion.button
              type="button"
              class="btn btn-danger flex-1"
              whileTap={TAP_SCALE}
              onClick={async () => {
                await send({ kind: "setHistoryEnabled", enabled: false });
                setConfirming(false);
                await onChange();
              }}
            >
              {t("history_disable_confirm_cta")}
            </motion.button>
            <motion.button
              type="button"
              class="btn btn-ghost flex-1"
              whileTap={TAP_SCALE}
              onClick={() => setConfirming(false)}
            >
              {t("common_cancel")}
            </motion.button>
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}
