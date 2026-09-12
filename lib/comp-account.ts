// Account-specific full-access override (hardcoded).
// The logged-in account with this phone sees no buy/unlock/free/Buy-Now UI
// and can play every video for free.
export const COMP_ACCOUNT_PHONE = '9949527339';

let compActive = false;

export function setCompAccount(phone?: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '');
  compActive = digits.endsWith(COMP_ACCOUNT_PHONE);
}

export function isCompAccount() {
  return compActive;
}
