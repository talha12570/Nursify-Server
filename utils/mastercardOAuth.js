/**
 * ═══════════════════════════════════════════════════════════════════
 * Mastercard OAuth 1.0a Request Signer
 * ═══════════════════════════════════════════════════════════════════
 *
 * Signs outgoing HTTP requests to Mastercard APIs using:
 *   - Consumer Key  (from .env MASTERCARD_CONSUMER_KEY)
 *   - Private Key   (extracted from .p12 signing certificate)
 *   - OAuth 1.0a    (RSA-SHA256 signature method)
 *
 * Ref: https://developer.mastercard.com/platform/documentation/security-and-authentication/using-oauth-1a-to-access-mastercard-apis/
 * ═══════════════════════════════════════════════════════════════════
 */

const OAuth = require('mastercard-oauth1-signer');
const forge  = require('node-forge');
const fs     = require('fs');
const path   = require('path');

const CONSUMER_KEY   = process.env.MASTERCARD_CONSUMER_KEY || '';
const KEY_PATH       = process.env.MASTERCARD_SIGNING_KEY_PATH || './certs/Nursify-sandbox-signing.p12';
const KEY_PASSWORD   = process.env.MASTERCARD_SIGNING_KEY_PASSWORD || 'keystorepassword';

let _privateKey = null;

/**
 * Load and cache the RSA private key from the .p12 certificate.
 * @returns {string}  PEM-encoded private key
 */
const getPrivateKey = () => {
    if (_privateKey) return _privateKey;

    const absolutePath = path.resolve(__dirname, '..', KEY_PATH);

    if (!fs.existsSync(absolutePath)) {
        throw new Error(
            `[MastercardOAuth] Signing certificate not found at: ${absolutePath}\n` +
            `Ensure the .p12 file is placed in Server/certs/ and MASTERCARD_SIGNING_KEY_PATH is correct in .env`
        );
    }

    // Read p12 binary
    const p12Buffer = fs.readFileSync(absolutePath);
    const p12b64    = p12Buffer.toString('base64');
    const p12Der    = forge.util.decode64(p12b64);
    const p12Asn1   = forge.asn1.fromDer(p12Der);
    const p12       = forge.pkcs12.pkcs12FromAsn1(p12Asn1, KEY_PASSWORD);

    // Extract private key from the PKCS#12 bag
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag  = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
                 || p12.getBags({ bagType: forge.pki.oids.keyBag })?.[forge.pki.oids.keyBag]?.[0];

    if (!keyBag) {
        throw new Error('[MastercardOAuth] No private key found in the .p12 certificate.');
    }

    _privateKey = forge.pki.privateKeyToPem(keyBag.key);
    console.log('[MastercardOAuth] ✅ Signing certificate loaded successfully.');
    return _privateKey;
};

/**
 * Generate an OAuth 1.0a Authorization header for a Mastercard API request.
 *
 * @param {string} url      Full request URL (including query params)
 * @param {string} method   HTTP method ('GET', 'POST', 'PUT', etc.)
 * @param {any}    body     Request body (object or string). Pass null for GET.
 * @returns {string}        Value to use as the Authorization header
 */
const getAuthHeader = (url, method, body = null) => {
    const privateKey  = getPrivateKey();
    const bodyString  = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    return OAuth.getAuthorizationHeader(url, method, bodyString, CONSUMER_KEY, privateKey);
};

module.exports = { getAuthHeader };
