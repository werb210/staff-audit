// Initialize Google Analytics
export const initGA = () => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (!measurementId) {
        if (import.meta.env.DEV)
            console.debug("[GA] disabled (no measurement ID)");
        return;
    }
    // Add Google Analytics script to the head
    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script1);
    // Initialize gtag
    const script2 = document.createElement("script");
    script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
    document.head.appendChild(script2);
};
// Track page views - useful for single-page applications
export const trackPageView = (url) => {
    if (typeof window === "undefined" || !window.gtag)
        return;
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (!measurementId)
        return;
    window.gtag("config", measurementId, {
        page_path: url,
    });
};
// Track events
export const trackEvent = (action, category, label, value) => {
    if (typeof window === "undefined" || !window.gtag)
        return;
    window.gtag("event", action, {
        event_category: category,
        event_label: label,
        value: value,
    });
};
