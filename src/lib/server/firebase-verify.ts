import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Firebase is used only to prove the retailer owns the phone number (RFD §2.2). The ID
// token is verified here with Google's public keys, so no Firebase service account or
// admin SDK is needed: https://firebase.google.com/docs/auth/admin/verify-id-tokens

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

/** Returns the verified +91 phone number from a Firebase ID token, or throws. */
export async function verifyFirebasePhone(idToken: string): Promise<string> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set");

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
    clockTolerance: 30,
  });

  if (!payload.sub) throw new Error("token has no subject");
  // Only accept a fresh sign-in (the OTP was just entered), not an old cached token.
  const authTime = Number(payload.auth_time);
  if (!authTime || Date.now() / 1000 - authTime > 10 * 60) throw new Error("sign-in is too old");

  const phone = payload.phone_number;
  if (typeof phone !== "string" || !/^\+91[6-9]\d{9}$/.test(phone)) throw new Error("not an Indian mobile number");
  return phone;
}
