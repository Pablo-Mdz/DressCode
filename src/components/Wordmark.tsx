// SPDX-FileCopyrightText: © 2026 Pablo Cigoy
// SPDX-License-Identifier: AGPL-3.0-only

export default function Wordmark({ size = 52 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      Dress<em>Code</em>
    </span>
  );
}
