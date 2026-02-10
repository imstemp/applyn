/**
 * Gumroad license verification for applyn.
 * API: https://gumroad.com/api#licenses
 * Verify License does not require OAuth; use product_id from the license key module on your product's content page.
 */
const GUMROAD_VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';

/** Set to your Gumroad product ID (from the product's license key module on the content page), or use GUMROAD_PRODUCT_ID env. */
const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID || 'Gj4UTNuxctCa6pXQ1v25bw==';

export interface GumroadVerifyResult {
  success: boolean;
  error?: string;
}

export async function verifyLicense(licenseKey: string): Promise<GumroadVerifyResult> {
  const key = licenseKey?.trim();
  if (!key) {
    return { success: false, error: 'License key is required.' };
  }

  if (!GUMROAD_PRODUCT_ID || GUMROAD_PRODUCT_ID === 'YOUR_GUMROAD_PRODUCT_ID') {
    return { success: false, error: 'Product ID not configured. Set GUMROAD_PRODUCT_ID in electron/gumroad.ts or env.' };
  }

  try {
    const body = new URLSearchParams({
      product_id: GUMROAD_PRODUCT_ID,
      license_key: key,
      increment_uses_count: 'true',
    });

    const response = await fetch(GUMROAD_VERIFY_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await response.json()) as {
      success?: boolean;
      message?: string | null;
      purchase?: { refunded?: boolean; disputed?: boolean; test?: boolean };
    };

    if (response.ok && data.success) {
      if (data.purchase?.refunded) {
        return { success: false, error: 'This license was refunded.' };
      }
      if (data.purchase?.disputed) {
        return { success: false, error: 'This license is under dispute.' };
      }
      if (data.purchase?.test) {
        return { success: false, error: 'Test purchases are not valid for activation.' };
      }
      return { success: true };
    }

    return {
      success: false,
      error: data.message || `Validation failed (${response.status}). Please try again.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    console.error('Gumroad verify error:', err);
    return { success: false, error: message };
  }
}
