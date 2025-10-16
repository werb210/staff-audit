import { test, expect } from "@playwright/test";

const API = process.env.STAFF_API_BASE || "http://localhost:5000";
test("object storage: PUT → LIST → GET", async ({ request }) => {
  const key = `test/${Date.now()}.txt`;

  // sign PUT
  const putUrl = await (await request.get(`${API}/api/objects/sign`, {
    params: { op: "put", scope: "private", key }
  })).text();
  expect(putUrl).toContain("X-Amz-Signature");

  // upload
  const putRes = await fetch(putUrl, { method: "PUT", body: "hello", headers: { "Content-Type": "text/plain" }});
  expect(putRes.status).toBeLessThan(400);

  // list
  const list = await (await request.get(`${API}/api/objects/list`, {
    params: { scope:"private", prefix:"test/" }
  })).json();
  expect(Array.isArray(list)).toBeTruthy();
  expect(list.some((x:any)=>x.key===key)).toBeTruthy();

  // sign GET
  const getUrl = await (await request.get(`${API}/api/objects/sign`, {
    params: { op:"get", scope:"private", key }
  })).text();
  const getRes = await fetch(getUrl);
  expect(await getRes.text()).toBe("hello");
});