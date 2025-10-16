import { twilioClient } from "./twilioClient";

type LookupResult = {
  phoneNumber: string;
  nationalFormat?: string;
  countryCode?: string;
  lineType?: string;       // mobile,fixedVoip,landline,unknown
  carrierName?: string;
  smsCapable?: boolean;
};

export async function lookupNumber(toE164: string): Promise<LookupResult> {
  try {
    const resp = await twilioClient.lookups.v2
      .phoneNumbers(toE164)
      .fetch({ fields: "line_type_intelligence,carrier" });

    const line = (resp.lineTypeIntelligence as any)?.type || "unknown";
    const carrier = (resp.carrier as any)?.name;
    // Heuristic: treat mobile + fixedVoip as SMS-capable (your policy may differ)
    const smsCapable = ["mobile","fixedVoip","voip"].includes(line.toLowerCase());

    console.log(`📞 [LOOKUP] ${toE164}: ${line} (${carrier}) - SMS capable: ${smsCapable}`);

    return {
      phoneNumber: resp.phoneNumber!,
      nationalFormat: resp.nationalFormat,
      countryCode: resp.countryCode,
      lineType: line,
      carrierName: carrier,
      smsCapable,
    };
  } catch (error: any) {
    console.error(`❌ [LOOKUP] Failed for ${toE164}:`, error.message);
    // Return fallback assuming mobile/SMS capable
    return {
      phoneNumber: toE164,
      lineType: "unknown",
      smsCapable: true,
    };
  }
}