import { reportFeatureMount, reportActionAvailable } from "./featureClient";

/** Call once per page/panel mount. */
export function featurePanelMounted(id: string) {
  reportFeatureMount(id);
}

/** Call at least once wherever you render a button that triggers feature work. */
export function featureActionAvailable(id: string) {
  reportActionAvailable(id);
}
