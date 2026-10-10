import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./firebase";
import { translate, type Lang } from "./i18n";
import { firstName } from "./user";
import type { Couple, CoupleOutfit, Invite, Weather } from "./types";

// Firestore:
//   invites/{email en minúsculas}      → Invite (quién invita a quién)
//   couples/{uidA_uidB}                → Couple (uids ordenados)
//   couples/{id}/outfits/{id}          → CoupleOutfit (los escribe la Cloud Function)

function me() {
  const u = auth.currentUser;
  if (!u) throw new Error(translate("common.sessionExpired"));
  return u;
}

export const canReceiveInvites = () => Boolean(auth.currentUser?.email && auth.currentUser.emailVerified);

export async function getCouple(): Promise<Couple | null> {
  const snap = await getDocs(query(collection(db, "couples"), where("members", "array-contains", me().uid), limit(1)));
  const d = snap.docs[0];
  return d ? ({ id: d.id, ...d.data() } as Couple) : null;
}

export async function getIncomingInvite(): Promise<Invite | null> {
  if (!canReceiveInvites()) return null;
  const email = me().email!.toLowerCase();
  const snap = await getDoc(doc(db, "invites", email));
  if (!snap.exists() || snap.get("from_uid") === me().uid) return null;
  return { email, ...snap.data() } as Invite;
}

export async function getOutgoingInvite(): Promise<Invite | null> {
  const snap = await getDocs(query(collection(db, "invites"), where("from_uid", "==", me().uid), limit(1)));
  const d = snap.docs[0];
  return d ? ({ email: d.id, ...d.data() } as Invite) : null;
}

export async function sendInvite(email: string): Promise<Invite> {
  const u = me();
  const target = email.trim().toLowerCase();
  const previous = await getOutgoingInvite();
  if (previous && previous.email !== target) await deleteDoc(doc(db, "invites", previous.email));
  const invite = {
    from_uid: u.uid,
    from_name: firstName(u),
    from_email: u.email ?? "",
    created_at: Date.now(),
  };
  await setDoc(doc(db, "invites", target), invite);
  return { email: target, ...invite };
}

export async function cancelInvite(invite: Invite) {
  await deleteDoc(doc(db, "invites", invite.email));
}

export async function acceptInvite(invite: Invite): Promise<Couple> {
  const u = me();
  const members = [invite.from_uid, u.uid].sort();
  const id = members.join("_");
  const couple = {
    members,
    names: { [invite.from_uid]: invite.from_name, [u.uid]: firstName(u) },
    created_at: Date.now(),
  };
  await setDoc(doc(db, "couples", id), couple);
  await deleteDoc(doc(db, "invites", invite.email));
  return { id, ...couple };
}

export async function declineInvite(invite: Invite) {
  await deleteDoc(doc(db, "invites", invite.email));
}

export async function unlink(couple: Couple) {
  await deleteDoc(doc(db, "couples", couple.id));
}

// ───── Looks en pareja ─────

const callCouple = httpsCallable<
  { prompt: string; weather: Weather | null; lang: Lang },
  { outfit: CoupleOutfit & { couple_id: string } }
>(functions, "coupleStyle", { timeout: 300_000 });

export async function requestCoupleStyle(prompt: string, weather: Weather | null, lang: Lang): Promise<CoupleOutfit> {
  try {
    const { data } = await callCouple({ prompt, weather, lang });
    return data.outfit;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    throw new Error(message && message.toLowerCase() !== "internal" ? message : translate("day.error"));
  }
}

export async function listCoupleOutfits(couple: Couple): Promise<CoupleOutfit[]> {
  const snap = await getDocs(
    query(collection(db, "couples", couple.id, "outfits"), orderBy("created_at", "desc"), limit(100)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CoupleOutfit);
}

export async function chooseCoupleOutfit(couple: Couple, id: string, index: number | null) {
  await updateDoc(doc(db, "couples", couple.id, "outfits", id), { chosen_index: index });
}

export async function deleteCoupleOutfit(couple: Couple, id: string) {
  await deleteDoc(doc(db, "couples", couple.id, "outfits", id));
}
