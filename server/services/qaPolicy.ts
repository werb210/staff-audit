export function channelRequiresQA(channel: "sms"|"email") {
  const r = (process.env.REQUIRE_QA || "all").toLowerCase();
  if (r === "all") return true;
  if (r === "none") return false;
  return r === channel;
}