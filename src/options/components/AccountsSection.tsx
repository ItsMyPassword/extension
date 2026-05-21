import { useEffect, useMemo, useState } from "preact/hooks";
import { motion } from "framer-motion";
import { send } from "../api.js";
import { t } from "../../shared/i18n.js";
import { SOFT_SPRING, TAP_SCALE } from "../../shared/motion.js";
import { IconClose } from "../../shared/icons.js";
import type { AccountEntry } from "../../shared/types.js";

interface Props {
  enabled: boolean;
}

export function AccountsSection({ enabled }: Props) {
  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [query, setQuery] = useState("");

  const refresh = async () => {
    if (!enabled) {
      setEntries([]);
      return;
    }
    try {
      const res = await send({ kind: "listAccounts" });
      setEntries(res.entries);
    } catch {
      setEntries([]);
    }
  };

  useEffect(() => {
    void refresh();
  }, [enabled]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return entries;
    return entries.filter(
      (e) => e.domain.toLowerCase().includes(q) || e.username.toLowerCase().includes(q),
    );
  }, [entries, query]);

  if (!enabled) return null;

  return (
    <motion.section
      class="flex flex-col gap-4"
      variants={{
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0, transition: SOFT_SPRING },
      }}
    >
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="m-0 text-base font-semibold tracking-[-0.015em] text-(--color-ink)">
          {t("history_section_title")}
        </h2>
        <input
          class="input w-72"
          type="search"
          placeholder={t("history_search_placeholder")}
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="card p-0">
        {filtered.length === 0 ? (
          <p class="m-0 p-6 text-sm text-(--color-ink-muted)">{t("history_empty")}</p>
        ) : (
          <ul class="list-none m-0 p-0 divide-y divide-(--color-line)">
            {filtered.map((entry) => (
              <li
                key={entry.domain + entry.username}
                class="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div class="flex flex-col min-w-0">
                  <span class="text-sm font-medium text-(--color-ink) truncate">
                    {entry.domain}
                  </span>
                  <span class="text-xs text-(--color-ink-muted) truncate">{entry.username}</span>
                </div>
                <motion.button
                  type="button"
                  class="btn btn-quiet btn-icon"
                  whileTap={TAP_SCALE}
                  aria-label={t("history_delete_aria")}
                  onClick={async () => {
                    await send({
                      kind: "deleteAccount",
                      domain: entry.domain,
                      username: entry.username,
                    });
                    await refresh();
                  }}
                >
                  <IconClose size={14} />
                </motion.button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}
