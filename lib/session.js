import { SignJWT, jwtVerify } from "jose";

const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET);
const options = { algorithm: "HS256", expiresIn: "7d" };

export async function encryptSession(sessionData) {
  return await new SignJWT(sessionData).setProtectedHeader({ alg: "HS256" }).sign(secretKey);
}

export async function decryptSession(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    return null;
  }
}
