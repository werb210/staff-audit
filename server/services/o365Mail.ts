export async function sendUserEmail({to,subject,text,html}:{to:string;subject:string;text?:string;html?:string}){
  // TODO: wire real O365. Stub is ok.
  console.log("[MAIL] ->", to, subject);
}