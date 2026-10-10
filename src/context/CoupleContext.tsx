import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import {
  acceptInvite,
  cancelInvite,
  declineInvite,
  getCouple,
  getIncomingInvite,
  getOutgoingInvite,
  sendInvite,
  unlink,
} from "../lib/couple";
import type { Couple, Invite } from "../lib/types";

type CoupleState = {
  couple: Couple | null;
  partnerName: string;
  incoming: Invite | null;
  outgoing: Invite | null;
  loaded: boolean;
  refresh: () => Promise<void>;
  invite: (email: string) => Promise<void>;
  cancel: () => Promise<void>;
  accept: () => Promise<void>;
  decline: () => Promise<void>;
  unlinkCouple: () => Promise<void>;
};

const CoupleContext = createContext<CoupleState | null>(null);

export function CoupleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [incoming, setIncoming] = useState<Invite | null>(null);
  const [outgoing, setOutgoing] = useState<Invite | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const c = await getCouple();
      setCouple(c);
      if (c) {
        setIncoming(null);
        setOutgoing(null);
      } else {
        const [inc, out] = await Promise.all([getIncomingInvite(), getOutgoingInvite()]);
        setIncoming(inc);
        setOutgoing(out);
      }
    } catch (err) {
      console.error("No se pudo cargar el vínculo de pareja", err);
    } finally {
      setLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const partnerUid = couple?.members.find((m) => m !== user?.uid);
  const value: CoupleState = {
    couple,
    partnerName: (partnerUid && couple?.names[partnerUid]) || "",
    incoming,
    outgoing,
    loaded,
    refresh,
    invite: async (email) => setOutgoing(await sendInvite(email)),
    cancel: async () => {
      if (outgoing) await cancelInvite(outgoing);
      setOutgoing(null);
    },
    accept: async () => {
      if (!incoming) return;
      setCouple(await acceptInvite(incoming));
      setIncoming(null);
      setOutgoing(null);
    },
    decline: async () => {
      if (incoming) await declineInvite(incoming);
      setIncoming(null);
    },
    unlinkCouple: async () => {
      if (couple) await unlink(couple);
      setCouple(null);
    },
  };

  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
}

export function useCouple(): CoupleState {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error("useCouple fuera de CoupleProvider");
  return ctx;
}
