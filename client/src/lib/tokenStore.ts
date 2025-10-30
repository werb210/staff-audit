const k = { a: "bf.access", r: "bf.refresh" };

export const tokenStore = {
  set(access: string, refresh: string) {
    localStorage.setItem(k.a, access);
    localStorage.setItem(k.r, refresh);
  },
  setAccess(access: string) {
    localStorage.setItem(k.a, access);
  },
  getAccess() {
    return localStorage.getItem(k.a) || "";
  },
  getRefresh() {
    return localStorage.getItem(k.r) || "";
  },
  clear() {
    localStorage.removeItem(k.a);
    localStorage.removeItem(k.r);
  },
};
