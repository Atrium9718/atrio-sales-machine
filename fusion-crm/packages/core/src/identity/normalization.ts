export function normalizePhone(raw: string, defaultCountry = 'CO'): string | null {
  if (!raw) return null;
  // Strip non-digits except +
  let cleaned = raw.replace(/[^\d+]/g, '');

  if (defaultCountry === 'CO') {
    // Already E.164
    if (cleaned.startsWith('+57') && cleaned.length === 13) return cleaned;
    
    // With 57 but no +
    if (cleaned.startsWith('57') && cleaned.length === 12) return '+' + cleaned;
    
    // Normal 10 digits
    if (cleaned.length === 10) return '+57' + cleaned;
    
    // With 0 or 03 lead (old dialing, e.g. 03001234567 is 11 digits)
    if (cleaned.startsWith('03') && cleaned.length === 11) return '+57' + cleaned.substring(1);
    if (cleaned.startsWith('03') && cleaned.length === 12) return '+57' + cleaned.substring(2);
  }

  // Fallback
  if (cleaned.startsWith('+')) return cleaned;
  return null;
}

export function normalizeEmail(raw: string): string | null {
  if (!raw) return null;
  let email = raw.trim().toLowerCase();
  
  // Basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return null;

  // Handle +tag
  const [localPart, domain] = email.split('@');
  if (localPart && domain) {
    let cleanLocal = localPart.split('+')[0];
    
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      cleanLocal = cleanLocal.replace(/\./g, '');
    }
    
    email = `${cleanLocal}@${domain}`;
  }
  return email;
}

export function normalizeSocialId(raw: string, channel: string): string | null {
  if (!raw) return null;
  return raw.trim(); // Just trim
}
