// SPDX-FileCopyrightText: © 2026 Pablo Cigoy
// SPDX-License-Identifier: AGPL-3.0-only

export function firstName(user: { displayName: string | null; email: string | null } | null) {
  return user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "";
}
