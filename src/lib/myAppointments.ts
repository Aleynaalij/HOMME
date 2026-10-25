// Remembers a client's bookings on their own device (no account needed).
const KEY = "homme:appointments";

export function rememberAppointment(token: string) {
  try {
    const list = savedTokens().filter((t) => t !== token);
    localStorage.setItem(KEY, JSON.stringify([token, ...list].slice(0, 10)));
  } catch {
    /* private mode */
  }
}

export function savedTokens(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((t) => typeof t === "string" && /^[a-f0-9]{36}$/.test(t)) : [];
  } catch {
    return [];
  }
}
