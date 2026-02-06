/**
 * Lemon Squeezy license verification for applyn.
 * License API: https://docs.lemonsqueezy.com/api/license-api/validate-license-key
 * No API key required for validation (public endpoint).
 */
const LEMON_SQUEEZY_VALIDATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/validate';

export interface LemonSqueezyVerifyResult {
  success: boolean;
  error?: string;
}

export async function verifyLicense(licenseKey: string): Promise<LemonSqueezyVerifyResult> {
  const key = licenseKey?.trim();
  if (!key) {
    return { success: false, error: 'License key is required.' };
  }

  try {
    const body = new URLSearchParams({
      license_key: key,
    });

    const response = await fetch(LEMON_SQUEEZY_VALIDATE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Validation failed (${response.status}). Please try again.`,
      };
    }

    const data = (await response.json()) as {
      valid?: boolean;
      error?: string | null;
    };

    if (data.valid) {
      return { success: true };
    }
    return {
      success: false,
      error: data.error || 'Invalid or expired license key.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    console.error('Lemon Squeezy verify error:', err);
    return { success: false, error: message };
  }
}
