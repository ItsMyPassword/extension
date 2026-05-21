/**
 * Settings section for the Google favicon fallback. Off keeps the popup
 * fully local (initials placeholder when Chrome's cache misses).
 */
import { motion } from "framer-motion";
import { send } from "../api.js";
import { t } from "../../shared/i18n.js";
import { SOFT_SPRING } from "../../shared/motion.js";

interface Props {
  enabled: boolean;
  onChange: () => Promise<void> | void;
}

export function FaviconSection({ enabled, onChange }: Props) {
  return (
    <motion.section
      class="flex flex-col gap-3"
      variants={{
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: SOFT_SPRING },
      }}
    >
      <div class="flex flex-col gap-0.5">
        <h2 class="m-0 text-sm font-semibold tracking-[-0.01em]">{t("favicon_section_title")}</h2>
        <span class="text-xs text-(--color-ink-muted) leading-snug">
          {t("favicon_section_hint")}
        </span>
      </div>
      <div class="card p-4 flex-row items-center justify-between gap-4">
        <span class="text-sm text-(--color-ink)">{t("favicon_toggle_label")}</span>
        <label class="switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={async (e) => {
              await send({
                kind: "setFaviconFallbackEnabled",
                enabled: (e.target as HTMLInputElement).checked,
              });
              await onChange();
            }}
          />
          <span class="switch-track" />
          <span class="switch-thumb" />
        </label>
      </div>
    </motion.section>
  );
}
