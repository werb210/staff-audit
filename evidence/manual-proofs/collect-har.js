// Automated HAR Collection for Manual Proofs
// Run in browser DevTools console to collect network traffic

let harCollector = {
    recording: false,
    currentProof: null,
    
    start(proofNumber) {
        this.recording = true;
        this.currentProof = proofNumber;
        console.log(`📹 Starting HAR collection for Proof ${proofNumber}`);
        
        // Clear existing network logs
        if (window.chrome && chrome.devtools) {
            chrome.devtools.network.clear();
        }
        
        // In actual implementation, this would hook into DevTools API
        console.log('🌐 Network recording started');
    },
    
    stop() {
        if (!this.recording) return;
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const filename = `proof-${this.currentProof}-${timestamp}.har`;
        
        console.log(`💾 Saving HAR file: ${filename}`);
        
        // In actual implementation, this would export HAR data
        // For now, user must manually export via DevTools
        
        this.recording = false;
        this.currentProof = null;
        
        return filename;
    }
};

// Make available globally
window.harCollector = harCollector;
console.log('✅ HAR Collector initialized. Use harCollector.start(proofNumber) and harCollector.stop()');
