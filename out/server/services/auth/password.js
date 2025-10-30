import bcrypt from "bcryptjs";
export async function hashPassword(pw) { return await bcrypt.hash(pw, 10); }
export async function verifyPassword(pw, hash) { return !!hash && await bcrypt.compare(pw, hash); }
