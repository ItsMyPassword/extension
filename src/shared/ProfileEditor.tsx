/**
 * Reusable profile editor — used by both the options page and the inline
 * badge. Kept dependency-light (no framer-motion) so the badge bundle stays
 * small. CSS handles the few transitions we need.
 */
import type { MemorableProfile, Profile, RandomProfile } from "./types.js";
import { DEFAULT_MEMORABLE_PROFILE, DEFAULT_RANDOM_PROFILE } from "./types.js";
import { t } from "./i18n.js";

interface Props {
  profile: Profile;
  onChange: (next: Profile) => void;
  /** When true, hides the counter row to save vertical space. */
  compact?: boolean;
}

const CLASS_KEYS = ["lower", "upper", "digits", "symbols"] as const;

export function ProfileEditor({ profile, onChange, compact = false }: Props) {
  return (
    <div class="flex flex-col gap-4">
      <div class="segmented grid-cols-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-pressed={profile.mode === "random"}
          onClick={() =>
            onChange(
              profile.mode === "random"
                ? profile
                : { ...DEFAULT_RANDOM_PROFILE, counter: profile.counter },
            )
          }
        >
          {t("profile_mode_random")}
        </button>
        <button
          type="button"
          role="tab"
          aria-pressed={profile.mode === "memorable"}
          onClick={() =>
            onChange(
              profile.mode === "memorable"
                ? profile
                : { ...DEFAULT_MEMORABLE_PROFILE, counter: profile.counter },
            )
          }
        >
          {t("profile_mode_memorable")}
        </button>
      </div>

      <div class="flex flex-col gap-4">
        {profile.mode === "random" ? (
          <RandomEditor profile={profile} onChange={onChange} />
        ) : (
          <MemorableEditor profile={profile} onChange={onChange} />
        )}
      </div>

      {!compact ? (
        <CounterField
          counter={profile.counter}
          onChange={(c) => onChange({ ...profile, counter: c })}
        />
      ) : null}
    </div>
  );
}

function RandomEditor({
  profile,
  onChange,
}: {
  profile: RandomProfile;
  onChange: (next: RandomProfile) => void;
}) {
  return (
    <>
      <div class="flex flex-col gap-2">
        <div class="flex justify-between items-baseline">
          <span class="field-label">{t("profile_length_label")}</span>
          <span class="font-mono text-sm text-(--color-accent-600) dark:text-(--color-accent-400)">
            {profile.length}
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={35}
          value={profile.length}
          aria-label={t("profile_length_label")}
          onInput={(e) =>
            onChange({
              ...profile,
              length: Number.parseInt((e.target as HTMLInputElement).value, 10),
            })
          }
        />
      </div>
      <div class="flex flex-col gap-2">
        <span class="field-label">{t("profile_classes_label")}</span>
        <div class="grid grid-cols-2 gap-2">
          {CLASS_KEYS.map((key) => (
            <Toggle
              key={key}
              label={t(`profile_class_${key}`)}
              checked={profile[key]}
              onChange={(checked) => onChange({ ...profile, [key]: checked })}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function MemorableEditor({
  profile,
  onChange,
}: {
  profile: MemorableProfile;
  onChange: (next: MemorableProfile) => void;
}) {
  return (
    <>
      <div class="flex flex-col gap-2">
        <div class="flex justify-between items-baseline">
          <span class="field-label">{t("profile_words_label")}</span>
          <span class="font-mono text-sm text-(--color-accent-600) dark:text-(--color-accent-400)">
            {profile.wordCount}
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={8}
          value={profile.wordCount}
          aria-label={t("profile_words_label")}
          onInput={(e) =>
            onChange({
              ...profile,
              wordCount: Number.parseInt((e.target as HTMLInputElement).value, 10),
            })
          }
        />
      </div>
      <div class="flex flex-col gap-2">
        <span class="field-label">{t("profile_separator_label")}</span>
        <div class="segmented grid-cols-3">
          {(["-", ".", "_"] as const).map((sep) => (
            <button
              key={sep}
              type="button"
              class="font-mono"
              aria-pressed={profile.separator === sep}
              onClick={() => onChange({ ...profile, separator: sep })}
            >
              {sep}
            </button>
          ))}
        </div>
      </div>
      <Toggle
        label={t("profile_capitalise_label")}
        checked={profile.capitalise}
        onChange={(checked) => onChange({ ...profile, capitalise: checked })}
      />
      <Toggle
        label={t("profile_suffix_label")}
        checked={profile.suffix}
        onChange={(checked) => onChange({ ...profile, suffix: checked })}
      />
    </>
  );
}

function CounterField({ counter, onChange }: { counter: number; onChange: (n: number) => void }) {
  return (
    <label class="flex flex-col gap-2">
      <span class="field-label">{t("profile_counter_label")}</span>
      <input
        class="input input-mono"
        type="number"
        min={1}
        value={counter}
        onChange={(e) => {
          const n = Number.parseInt((e.target as HTMLInputElement).value, 10);
          if (Number.isFinite(n) && n >= 1) onChange(n);
        }}
      />
      <span class="field-hint">{t("profile_counter_hint")}</span>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label class="flex items-center justify-between gap-2 cursor-pointer text-sm">
      <span>{label}</span>
      <span class="switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
        />
        <span class="switch-track" />
        <span class="switch-thumb" />
      </span>
    </label>
  );
}
