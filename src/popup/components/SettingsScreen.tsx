/**
 * Settings screen — two-level navigation. The root view is a list of
 * six category rows (à la Bitwarden); clicking one opens a dedicated
 * sub-page that shows just that category's controls plus a back button
 * that returns to the menu. The Header's back button leaves the
 * settings screen entirely when on the menu, and returns to the menu
 * when on a sub-page.
 */
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { AnimatePresence, motion } from "framer-motion";
import { send } from "../api.js";
import { Header } from "./Header.js";
import { ProfileEditor } from "../../shared/ProfileEditor.js";
import { PinSection } from "../../options/components/PinSection.js";
import { DangerSection } from "../../options/components/DangerSection.js";
import { HistorySection } from "../../options/components/HistorySection.js";
import { SyncSection } from "../../options/components/SyncSection.js";
import { SitesSection } from "../../options/components/SitesSection.js";
import { FaviconSection } from "./FaviconSection.js";
import { ClipboardSection } from "./ClipboardSection.js";
import { IconChevronRight } from "../../shared/icons.js";
import { t } from "../../shared/i18n.js";
import { SOFT_SPRING, TAP_SCALE } from "../../shared/motion.js";
import type { Profile } from "../../shared/types.js";
import { fingerprint, screen } from "../state.js";

type SubPage = "generation" | "security" | "accounts" | "sync" | "comfort" | "danger";

interface State {
  defaultProfile: Profile;
  autoLockMinutes: number;
  hasPin: boolean;
  historyEnabled: boolean;
  faviconFallbackEnabled: boolean;
  clipboardClearSeconds: number;
  accountsCount: number;
  sites: Record<string, Profile>;
}

export function SettingsScreen() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<SubPage | null>(null);

  const refresh = async () => {
    try {
      const res = await send({ kind: "getState" });
      let accountsCount = 0;
      if (res.historyEnabled) {
        try {
          const list = await send({ kind: "listAccounts" });
          accountsCount = list.entries.length;
        } catch {
          accountsCount = 0;
        }
      }
      setState({
        defaultProfile: res.defaultProfile,
        autoLockMinutes: res.autoLockMinutes,
        hasPin: res.hasPin,
        historyEnabled: res.historyEnabled,
        faviconFallbackEnabled: res.faviconFallbackEnabled,
        clipboardClearSeconds: res.clipboardClearSeconds,
        accountsCount,
        sites: res.sites,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not load state");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const back = (): void => {
    if (page !== null) {
      setPage(null);
    } else {
      screen.value = "main";
    }
  };

  return (
    <motion.div
      class="flex flex-col gap-4 p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SOFT_SPRING}
    >
      <Header
        subtitle={page !== null ? subPageTitle(page) : t("options_title")}
        fingerprint={fingerprint.value}
        actions={
          <motion.button
            type="button"
            class="btn btn-quiet btn-icon"
            whileTap={TAP_SCALE}
            onClick={back}
            aria-label={t("common_back")}
          >
            <IconChevronRight size={18} style={{ transform: "rotate(180deg)" }} />
          </motion.button>
        }
      />

      <AnimatePresence mode="wait">
        {error !== null ? (
          <motion.div
            key="error"
            class="callout callout-danger"
            role="alert"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.div>
        ) : state === null ? (
          <motion.div
            key="loading"
            class="flex flex-col gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div class="skeleton h-5 w-2/5" />
            <div class="skeleton h-12 w-full" />
            <div class="skeleton h-5 w-1/3" />
            <div class="skeleton h-9 w-full" />
          </motion.div>
        ) : page === null ? (
          <Menu key="menu" onSelect={setPage} />
        ) : (
          <Page key={page} page={page} state={state} refresh={refresh} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Menu --------------------------------------------------------------

function Menu({ onSelect }: { onSelect: (p: SubPage) => void }) {
  const rows: { id: SubPage; title: string; hint: string }[] = [
    {
      id: "generation",
      title: t("settings_group_generation"),
      hint: t("settings_group_generation_hint"),
    },
    {
      id: "security",
      title: t("settings_group_security"),
      hint: t("settings_group_security_hint"),
    },
    {
      id: "accounts",
      title: t("settings_group_accounts"),
      hint: t("settings_group_accounts_hint"),
    },
    {
      id: "sync",
      title: t("settings_group_sync"),
      hint: t("settings_group_sync_hint"),
    },
    {
      id: "comfort",
      title: t("settings_group_comfort"),
      hint: t("settings_group_comfort_hint"),
    },
    {
      id: "danger",
      title: t("settings_group_danger"),
      hint: t("settings_group_danger_hint"),
    },
  ];

  return (
    <motion.ul
      class="flex flex-col gap-2 list-none p-0 m-0"
      initial="initial"
      animate="animate"
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.04 } } }}
    >
      {rows.map((r) => (
        <motion.li
          key={r.id}
          variants={{
            initial: { opacity: 0, y: 8 },
            animate: { opacity: 1, y: 0, transition: SOFT_SPRING },
          }}
        >
          <motion.button
            type="button"
            class="settings-row"
            onClick={() => onSelect(r.id)}
            whileTap={TAP_SCALE}
          >
            <span class="flex flex-col flex-1 min-w-0 text-left gap-0.5">
              <span class="text-sm font-medium text-(--color-ink)">{r.title}</span>
              <span class="text-xs text-(--color-ink-muted)">{r.hint}</span>
            </span>
            <IconChevronRight size={16} class="text-(--color-ink-muted) shrink-0" />
          </motion.button>
        </motion.li>
      ))}
    </motion.ul>
  );
}

function subPageTitle(p: SubPage): string {
  switch (p) {
    case "generation":
      return t("settings_group_generation");
    case "security":
      return t("settings_group_security");
    case "accounts":
      return t("settings_group_accounts");
    case "sync":
      return t("settings_group_sync");
    case "comfort":
      return t("settings_group_comfort");
    case "danger":
      return t("settings_group_danger");
  }
}

// --- Sub-pages ---------------------------------------------------------

function Page({
  page,
  state,
  refresh,
}: {
  page: SubPage;
  state: State;
  refresh: () => Promise<void>;
}) {
  return (
    <motion.div
      class="flex flex-col gap-5"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={SOFT_SPRING}
    >
      {page === "generation" ? (
        <>
          <CompactSection title={t("options_default_section")} hint={t("options_default_hint")}>
            <ProfileEditor
              profile={state.defaultProfile}
              onChange={async (next) => {
                await send({ kind: "setDefaultProfile", profile: next });
                await refresh();
              }}
            />
          </CompactSection>
          <SitesSection sites={state.sites} onChange={refresh} />
        </>
      ) : null}

      {page === "security" ? (
        <>
          <CompactSection title={t("options_autolock_section")} hint={t("options_autolock_hint")}>
            <label class="flex items-center justify-between gap-3">
              <span class="text-sm">{t("options_autolock_label")}</span>
              <input
                class="input input-mono w-20"
                type="number"
                min={0}
                max={1440}
                value={state.autoLockMinutes}
                onChange={async (e) => {
                  const minutes = Number.parseInt((e.target as HTMLInputElement).value, 10);
                  if (Number.isFinite(minutes)) {
                    await send({ kind: "setAutoLockMinutes", minutes });
                    await refresh();
                  }
                }}
              />
            </label>
          </CompactSection>
          <PinSection hasPin={state.hasPin} onChange={refresh} />
        </>
      ) : null}

      {page === "accounts" ? (
        <HistorySection
          enabled={state.historyEnabled}
          hasEntries={state.accountsCount > 0}
          onChange={refresh}
        />
      ) : null}

      {page === "sync" ? (
        state.historyEnabled ? (
          <SyncSection />
        ) : (
          <div class="card p-5 flex-col gap-2">
            <span class="text-sm text-(--color-ink)">{t("settings_sync_history_off_hint")}</span>
          </div>
        )
      ) : null}

      {page === "comfort" ? (
        <>
          <FaviconSection enabled={state.faviconFallbackEnabled} onChange={refresh} />
          <ClipboardSection seconds={state.clipboardClearSeconds} onChange={refresh} />
        </>
      ) : null}

      {page === "danger" ? <DangerSection onChange={refresh} /> : null}
    </motion.div>
  );
}

function CompactSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ComponentChildren;
}) {
  return (
    <motion.section
      class="flex flex-col gap-3"
      variants={{
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: SOFT_SPRING },
      }}
    >
      <div class="flex flex-col gap-0.5">
        <h2 class="m-0 text-sm font-semibold tracking-[-0.01em]">{title}</h2>
        {hint !== undefined ? (
          <span class="text-xs text-(--color-ink-muted) leading-snug">{hint}</span>
        ) : null}
      </div>
      <div class="card p-4">{children}</div>
    </motion.section>
  );
}
