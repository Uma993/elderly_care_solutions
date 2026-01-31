/**
 * Helpers for WebAuthn (passkey) flows. Convert between JSON options and browser API format.
 */

export function base64UrlToBuffer(base64Url) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convert server login options (JSON with base64url challenge) to PublicKeyCredentialRequestOptions.
 */
export function toAuthenticationOptions(json) {
  const challenge = base64UrlToBuffer(json.challenge);
  const allowCredentials = (json.allowCredentials || []).map((cred) => ({
    type: 'public-key',
    id: base64UrlToBuffer(cred.id)
  }));
  return {
    challenge,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    rpId: json.rpId,
    timeout: json.timeout,
    userVerification: json.userVerification ?? 'required'
  };
}

/**
 * Serialize PublicKeyCredential (assertion) to JSON for POST login-verify.
 */
export function credentialToJSON(credential) {
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
      authenticatorData: bufferToBase64Url(credential.response.authenticatorData),
      signature: bufferToBase64Url(credential.response.signature)
    }
  };
}

/**
 * Convert server registration options (JSON) to PublicKeyCredentialCreationOptions.
 */
export function toRegistrationOptions(json) {
  const user = json.user;
  return {
    challenge: base64UrlToBuffer(json.challenge),
    rp: json.rp,
    user: {
      id: base64UrlToBuffer(user.id),
      name: user.name,
      displayName: user.displayName || user.name
    },
    pubKeyCredParams: json.pubKeyCredParams,
    timeout: json.timeout,
    attestation: json.attestation || 'none',
    authenticatorSelection: json.authenticatorSelection,
    excludeCredentials: (json.excludeCredentials || []).map((cred) => ({
      type: 'public-key',
      id: base64UrlToBuffer(cred.id)
    }))
  };
}

/**
 * Serialize PublicKeyCredential (attestation) to JSON for POST register-verify.
 */
export function registrationCredentialToJSON(credential) {
  const response = credential.response;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject)
    }
  };
}

export function supportsWebAuthn() {
  return typeof window !== 'undefined' && window.PublicKeyCredential != null;
}
