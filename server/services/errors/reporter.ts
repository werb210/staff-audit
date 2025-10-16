import { postSlack } from "../alerts/slack";
export async function reportError(err:any, ctx:any={}){
  const text = [
    `🚨 ${ctx.kind||"ServerError"} ${ctx.route||""}`.trim(),
    err?.message ? `• ${err.message}` : "",
    ctx.trace_id ? `• trace_id=${ctx.trace_id}` : ""
  ].filter(Boolean).join("\n");
  await postSlack(text, { ctx, level:"error" });
}
