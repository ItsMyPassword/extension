/**
 * Pre-fill block shown above the username input when the active tab has
 * saved accounts. With exactly one entry we pre-fill silently on mount;
 * with several, we let the user pick.
 */
import { useEffect } from "preact/hooks";
import { motion } from "framer-motion";
import { t } from "../../shared/i18n.js";
import { POP_IN } from "../../shared/motion.js";
import { activeEmail, generated, savedAccounts } from "../state.js";

interface Props {
  onPick: (username: string) => void;
}

export function SavedAccountsForDomain({ onPick }: Props) {
  const entries = savedAccounts.value;

  // Pre-fill silently when exactly one saved entry exists for this domain.
  useEffect(() => {
    if (entries.length === 1 && activeEmail.value.trim().length === 0) {
      onPick(entries[0]!.username);
    }
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <motion.div class="flex flex-col gap-2" variants={POP_IN} initial="initial" animate="animate">
      <span class="field-label">{t("history_saved_for_site")}</span>
      <ul class="flex flex-col gap-1.5 list-none p-0 m-0">
        {entries.map((entry) => (
          <li key={entry.domain + entry.username}>
            <button
              type="button"
              class="chip w-full justify-between"
              onClick={() => {
                generated.value = null;
                onPick(entry.username);
              }}
            >
              <span class="truncate">{entry.username}</span>
              <span class="text-(--color-ink-subtle) text-[10px]">
                {formatRelative(entry.lastUsedAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function formatRelative(ts: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seconds < 45) return t("history_relative_just_now");
  if (seconds < 60 * 60) return `${Math.round(seconds / 60)}m`;
  if (seconds < 24 * 60 * 60) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
