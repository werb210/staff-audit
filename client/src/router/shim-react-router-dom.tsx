// Compatibility shim for legacy imports
export const BrowserRouter = () => {
  throw new Error(
    "BrowserRouter is not allowed — Wouter is the canonical router.",
  );
};
