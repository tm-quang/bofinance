
/**
 * Android Native Bridge
 * Handles communication between Web and Android Native App
 */

declare global {
    interface Window {
        Android?: {
            startScan: () => void;
            showToast?: (message: string) => void;
        };
        // The global callback function that Android will call
        onNativeScanResult?: (result: string) => void;
        // Global callback for QR code scanned results (can be called by external systems)
        onQRCodeScanned?: (scanResult: string) => void;
    }
}

/**
 * Check if running inside the Android Native App
 */
export const isAndroidApp = (): boolean => {
    return typeof window !== 'undefined' && !!window.Android;
};

/**
 * Trigger the native camera scanner
 */
export const startNativeScan = (): void => {
    if (isAndroidApp()) {
        console.log('Starting native scan...');
        window.Android?.startScan();
    } else {
        console.warn('Android interface not found. Make sure you are running in the native app.');
    }
};

/**
 * Setup the global callback for scan results
 * @param callback Function to handle the scanned result
 */
export const setupNativeScanCallback = (callback: (result: string) => void) => {
    window.onNativeScanResult = (result: string) => {
        console.log('Received native scan result:', result);
        
        // Call the provided callback
        callback(result);
        
        // Also trigger the global onQRCodeScanned function if it exists
        // This ensures external systems can also receive the result
        if (typeof window.onQRCodeScanned === 'function') {
            try {
                window.onQRCodeScanned(result);
            } catch (error) {
                console.error('Error calling onQRCodeScanned:', error);
            }
        }
    };
};

/**
 * Cleanup the global callback
 */
export const cleanupNativeScanCallback = () => {
    if (typeof window !== 'undefined') {
        window.onNativeScanResult = undefined;
    }
};
