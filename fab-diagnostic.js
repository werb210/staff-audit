console.log("=== DIALER FAB DIAGNOSTIC ===");

// 1) Check if FAB exists
const fab = document.querySelector("[data-testid=\"dialer-fab\"], .dialer-fab, button[aria-label*=\"dialer\" i], button[aria-label*=\"call\" i]");
if (fab) {
  console.log("✅ FAB found:", fab);
  const rect = fab.getBoundingClientRect();
  console.log("📐 FAB position:", rect);
  
  // Check what elements are at the FAB center
  const centerX = rect.left + rect.width/2;
  const centerY = rect.top + rect.height/2;
  const elementsAtCenter = document.elementsFromPoint(centerX, centerY);
  console.log("🎯 Elements at FAB center:", elementsAtCenter);
  
  // Check styles
  const styles = getComputedStyle(fab);
  console.log("🎨 FAB styles:", {
    display: styles.display,
    visibility: styles.visibility,
    opacity: styles.opacity,
    pointerEvents: styles.pointerEvents,
    zIndex: styles.zIndex,
    position: styles.position
  });
  
  // Test click event
  fab.addEventListener("click", () => console.log("🔵 FAB CLICK REGISTERED"), {once: false});
  
} else {
  console.log("❌ No FAB found");
  
  // Check what dialer-related elements exist
  const dialerEls = document.querySelectorAll("[class*=\"dialer\"], [data-testid*=\"dialer\"], [aria-label*=\"dialer\" i]");
  console.log("🔍 Found dialer elements:", dialerEls);
}

// 2) Check for overlays
const overlays = document.querySelectorAll(".overlay, .modal-overlay, .drawer-overlay, [style*=\"pointer-events\"]");
console.log("🚧 Potential overlays:", overlays);

console.log("=== END DIAGNOSTIC ===");
