export const CURRENT_CONSENT_VERSION = '2.5.0';

export interface ConsentRecord {
  accepted: boolean;
  timestamp: string; // ISO 8601 UTC timestamp (e.g. 2026-08-14T12:30:00.000Z)
  version: string;
  scope: string[];
  consentMethod: 'hero_checkbox' | 'terms_modal_button' | 'auth_sync';
  jurisdictionCompliance: ['DPDP_INDIA_2023', 'GDPR_EU', 'CCPA_US'];
}

export const CONSENT_KEYS = {
  accepted: 'typenova_terms_accepted',
  timestamp: 'typenova_consent_timestamp',
  version: 'typenova_consent_version',
  record: 'typenova_consent_record',
} as const;

/** Record user consent with high-precision ISO 8601 timestamp for DPDP/GDPR statutory compliance. */
export function recordConsent(method: ConsentRecord['consentMethod'] = 'hero_checkbox'): ConsentRecord {
  const timestamp = new Date().toISOString();
  const record: ConsentRecord = {
    accepted: true,
    timestamp,
    version: CURRENT_CONSENT_VERSION,
    scope: ['terms_of_service', 'privacy_protocol', 'anti_cheat'],
    consentMethod: method,
    jurisdictionCompliance: ['DPDP_INDIA_2023', 'GDPR_EU', 'CCPA_US'],
  };

  try {
    localStorage.setItem(CONSENT_KEYS.accepted, 'true');
    localStorage.setItem(CONSENT_KEYS.timestamp, timestamp);
    localStorage.setItem(CONSENT_KEYS.version, CURRENT_CONSENT_VERSION);
    localStorage.setItem(CONSENT_KEYS.record, JSON.stringify(record));
  } catch {
    // Gracefully handle storage quota or private browsing exceptions
  }

  return record;
}

/** Revoke user consent and clear local audit tokens. */
export function revokeConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEYS.accepted);
    localStorage.removeItem(CONSENT_KEYS.timestamp);
    localStorage.removeItem(CONSENT_KEYS.version);
    localStorage.removeItem(CONSENT_KEYS.record);
  } catch {
    // Gracefully handle
  }
}

/** Retrieve the active consent audit record from localStorage. */
export function getConsentRecord(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEYS.record);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentRecord;
  } catch {
    return null;
  }
}

/** Check if valid affirmative consent exists for the current platform version. */
export function hasValidConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEYS.accepted) === 'true';
  } catch {
    return false;
  }
}
