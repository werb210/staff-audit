export function assertE164(phone: string) {
  if (!/^\+?[1-9]\d{1,14}$/.test(phone)) {
    throw new Error("Invalid phone (must be E.164)");
  }
}

export const isTestNumber = (p: string) =>
  ["+15005550000","+15005550006","+15005550008","+15005550009"].includes(p);

export function maskPhone(phone: string): string {
  return phone.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, "+1 $1-***-$3");
}

export function enforceProductionSecurity(phone: string, environment: string = "production") {
  if (environment === "production" && isTestNumber(phone)) {
    throw new Error("Refusing to send to Twilio test number in production");
  }
}