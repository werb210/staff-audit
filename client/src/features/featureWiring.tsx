import { useEffect, PropsWithChildren } from "react";

const API = "/api/features";

async function post(path: string, body: any) {
  try {
    await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {}
}

/** Call inside any output panel component to mark it "mounted". */
export function useFeaturePanel(featureId: string, meta?: Record<string, any>) {
  useEffect(() => {
    post("/events", { featureId, kind: "panel-mounted", meta, at: Date.now() });
  }, [featureId]);
}

/** Put on any page where an action button exists for the feature. */
export function useFeatureActionAvailable(featureId: string, meta?: Record<string, any>) {
  useEffect(() => {
    post("/events", { featureId, kind: "action-available", meta, at: Date.now() });
  }, [featureId]);
}

/** Drop-in button that also logs action-fired. */
export function FeatureActionButton(
  props: PropsWithChildren<{ featureId: string; onClick?: (e: any) => void; className?: string }>
) {
  useFeatureActionAvailable(props.featureId);
  return (
    <button
      className={props.className ?? "btn btn-primary"}
      onClick={(e) => {
        post("/events", { featureId: props.featureId, kind: "action-fired", at: Date.now() });
        props.onClick?.(e);
      }}
      data-feature={props.featureId}
    >
      {props.children}
    </button>
  );
}