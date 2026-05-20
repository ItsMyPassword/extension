import type { JSX } from "preact";
import { motion } from "framer-motion";
import { IconBolt } from "../../shared/icons.js";
import { t } from "../../shared/i18n.js";
import { SOFT_SPRING } from "../../shared/motion.js";

interface Props {
  subtitle?: string | undefined;
  fingerprint?: string | null | undefined;
  actions?: JSX.Element | undefined;
}

/** Common popup header with the brand glyph + an optional subtitle/actions. */
export function Header({ subtitle, fingerprint, actions }: Props) {
  return (
    <header class="flex items-center justify-between gap-3">
      <div class="flex flex-col gap-0.5 min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <motion.span
            class="grid place-items-center w-[22px] h-[22px] rounded-md bg-(--color-accent-500)/12 text-(--color-accent-600) dark:text-(--color-accent-400)"
            initial={{ rotate: -8, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={SOFT_SPRING}
          >
            <IconBolt size={14} />
          </motion.span>
          <span class="font-semibold tracking-[-0.015em] text-sm text-(--color-ink)">
            {t("extName")}
          </span>
          {fingerprint !== undefined && fingerprint !== null ? (
            <motion.span
              class="fingerprint fingerprint-sm ml-1"
              title={t("unlock_expected_label")}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SOFT_SPRING, delay: 0.05 }}
            >
              {fingerprint}
            </motion.span>
          ) : null}
        </div>
        {subtitle !== undefined ? (
          <span class="text-xs text-(--color-ink-muted) truncate">{subtitle}</span>
        ) : null}
      </div>
      {actions !== undefined ? <div class="flex gap-1 shrink-0">{actions}</div> : null}
    </header>
  );
}
