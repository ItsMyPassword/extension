/**
 * Site icon with a graceful fallback chain.
 *
 * 1. Chrome's `_favicon/` service (cache local, no network)
 * 2. Google's s2 favicon CDN — opt-in, gated by `faviconFallbackEnabled`
 * 3. Two-letter initials inside a coloured box
 *
 * Each onError advances the step until we land on the initials. The chain
 * is stateless across renders for the same domain so changing the toggle
 * makes the next render reuse the right source.
 */
import { useEffect, useState } from "preact/hooks";
import { faviconUrl } from "../../shared/favicon.js";
import { faviconFallbackEnabled } from "../state.js";

interface Props {
  domain: string;
  size?: number;
}

export function Favicon({ domain, size = 32 }: Props) {
  const allowGoogle = faviconFallbackEnabled.value;
  const sources: string[] = [];
  const chrome = faviconUrl(domain, size);
  if (chrome !== null) sources.push(chrome);
  if (allowGoogle) sources.push(`https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`);

  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
  }, [domain, allowGoogle]);

  const current = sources[step];
  const dimension = Math.round(size * 0.62);
  if (current !== undefined) {
    return (
      <span class="account-row__favicon" aria-hidden="true" style={{ width: size, height: size }}>
        <img
          src={current}
          alt=""
          width={dimension}
          height={dimension}
          referrerPolicy="no-referrer"
          onError={() => setStep((s) => s + 1)}
        />
      </span>
    );
  }
  return (
    <span class="account-row__favicon" aria-hidden="true" style={{ width: size, height: size }}>
      <span class="font-mono uppercase" style={{ fontSize: Math.round(size * 0.35) }}>
        {domain.replace(/^www\./, "").slice(0, 2)}
      </span>
    </span>
  );
}
