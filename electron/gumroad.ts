/**
 * Gumroad license verification for applyn.
 * Set your product ID in GUMROAD_PRODUCT_ID (from your Gumroad product URL or dashboard).
 */
const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID || 'REPLACE_WITH_YOUR_PRODUCT_ID';
const GUMROAD_VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';

export interface GumroadVerifyResult {
  success: boolean;
  error?: string;
}

export async function verifyLicense(licenseKey: string): Promise<GumroadVerifyResult> {
  const key = licenseKey?.trim();
  if (!key) {
    return { success: false, error: 'License key is required.' };
  }

  if (GUMROAD_PRODUCT_ID === 'REPLACE_WITH_YOUR_PRODUCT_ID') {
    console.warn('Gumroad: GUMROAD_PRODUCT_ID not set. Set it in env or in electron/gumroad.ts for production.');
    // In dev, allow a placeholder for testing (optional)
    if (process.env.NODE_ENV === 'development') {
      return { success: true };
    }
    return { success: false, error: 'License verification is not configured.' };
  }

  try {
    const body = new URLSearchParams({
      product_id: GUMROAD_PRODUCT_ID,
      license_key: key,
      increment_uses_count: 'false',
    });

    const response = await fetch(GUMROAD_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = (await response.json()) as { success?: boolean; message?: string };
    if (data.success) {
      return { success: true };
    }
    return {
      success: false,
      error: data.message || 'Invalid or expired license key.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    console.error('Gumroad verify error:', err);
    return { success: false, error: message };
  }
}
