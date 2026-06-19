/**
 * Format a Vietnamese phone number for the Zalo ZNS API.
 *
 * Zalo ZNS requires the phone number in E.164-style format without the '+' prefix:
 * Vietnamese numbers must start with country code 84 (not 0).
 *
 * This function is idempotent — calling it twice on an already-formatted number
 * (e.g., '84912345678') returns the same value.
 *
 * @param phoneNumber - Raw phone number from the database (e.g., '0912345678')
 * @returns Formatted phone number (e.g., '84912345678')
 *
 * @example
 * formatPhoneForZalo('0912345678')   // '84912345678'
 * formatPhoneForZalo('84912345678')  // '84912345678' (idempotent)
 * formatPhoneForZalo('0 912 345 678') // '84912345678' (strips spaces)
 * formatPhoneForZalo('912345678')    // '84912345678' (no leading 0, no prefix)
 */
export function formatPhoneForZalo(phoneNumber: string): string {
  // Strip whitespace, hyphens, and parentheses
  let phone = phoneNumber.trim().replace(/[\s\-()]/g, '');

  // Convert 0xxx → 84xxx (remove leading 0, add country code 84)
  if (phone.startsWith('0')) {
    phone = '84' + phone.substring(1);
  }

  // Ensure starts with 84 (handles numbers with no leading 0 or 84 prefix)
  if (!phone.startsWith('84')) {
    phone = '84' + phone;
  }

  return phone;
}
