export function firstName(user: { displayName: string | null; email: string | null } | null) {
  return user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "";
}
