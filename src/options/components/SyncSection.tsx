/**
 * Settings section for self-hosted sync. Renders either:
 *   - the "not connected" CTA + inline wizard, OR
 *   - the "connected to X" status + disconnect button.
 */
import { useEffect, useState } from "preact/hooks";
import { motion } from "framer-motion";

import { send } from "../api.js";
import { SOFT_SPRING, TAP_SCALE } from "../../shared/motion.js";
import type { SyncSessionView } from "../../shared/messages.js";
import { SyncWizard } from "./SyncWizard.js";

export function SyncSection() {
  const [session, setSession] = useState<SyncSessionView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  async function refresh(): Promise<void> {
    const res = await send({ kind: "syncStatus" });
    setSession(res.session);
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function disconnect(): Promise<void> {
    await send({ kind: "syncDisconnect" });
    setConfirmDisconnect(false);
    await refresh();
  }

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
            Synchronisation
          </h2>
          <span class="text-xs text-(--color-ink-muted) leading-snug">
            Relie cette extension à un serveur self-hosted pour partager tes paramètres entre
            appareils. Aucun mot de passe n'est stocké côté serveur.
          </span>
        </div>
      </div>

      {!loaded ? (
        <div class="card p-5 text-xs text-(--color-ink-muted)">Chargement…</div>
      ) : session ? (
        <div class="card p-5 flex-col gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-(--color-ink-muted)">Serveur</span>
            <code class="text-sm text-(--color-ink) break-all">{session.baseUrl}</code>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs text-(--color-ink-muted)">Identifiant</span>
            <code class="text-sm text-(--color-ink) break-all">{session.email}</code>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs text-(--color-ink-muted)">Appareil</span>
            <code class="text-xs text-(--color-ink-muted) break-all">{session.deviceId}</code>
          </div>
          {confirmDisconnect ? (
            <div class="callout callout-danger flex-col gap-3" role="alertdialog">
              <span>
                Déconnecter retire la session de cet appareil. Le serveur conserve ton compte ; tu
                peux te reconnecter quand tu veux.
              </span>
              <div class="flex justify-end gap-2">
                <motion.button
                  type="button"
                  class="btn btn-ghost"
                  onClick={() => setConfirmDisconnect(false)}
                  whileTap={TAP_SCALE}
                >
                  Annuler
                </motion.button>
                <motion.button
                  type="button"
                  class="btn btn-danger"
                  onClick={() => void disconnect()}
                  whileTap={TAP_SCALE}
                >
                  Déconnecter
                </motion.button>
              </div>
            </div>
          ) : (
            <div class="flex justify-end">
              <motion.button
                type="button"
                class="btn btn-ghost text-xs"
                onClick={() => setConfirmDisconnect(true)}
                whileTap={TAP_SCALE}
              >
                Déconnecter cet appareil
              </motion.button>
            </div>
          )}
        </div>
      ) : wizardOpen ? (
        <SyncWizard onClose={() => setWizardOpen(false)} onConnected={refresh} />
      ) : (
        <div class="card p-5 flex-col gap-3">
          <span class="text-sm text-(--color-ink)">Pas encore de serveur connecté.</span>
          <div class="flex justify-end">
            <motion.button
              type="button"
              class="btn btn-primary"
              onClick={() => setWizardOpen(true)}
              whileTap={TAP_SCALE}
            >
              Connecter un serveur
            </motion.button>
          </div>
        </div>
      )}
    </motion.section>
  );
}
