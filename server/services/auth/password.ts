import bcrypt from "bcryptjs";
export async function hashPassword(pw:string){ return await bcrypt.hash(pw, 10); }
export async function verifyPassword(pw:string, hash:string|null){ return !!hash && await bcrypt.compare(pw, hash); }