/*
 * License Validation Module - Web1CAD
 * © 2025 Oleh Korobkov. All rights reserved.
 */

class LicenseValidator {
    constructor() {
        this.licenseKey = this.generateLicenseKey();
        this.isValid = false;
        this.checkInterval = null;
    }

    generateLicenseKey() {
        // Generate unique key based on environment
        const factors = [
            navigator.userAgent,
            screen.width + 'x' + screen.height,
            new Date().getFullYear(),
            'WEB1CAD-PRO'
        ];
        
        return btoa(factors.join('|')).substring(0, 20);
    }

    async validateLicense() {
        try {
            // Simulate license server check (в реальності - API call)
            const response = await this.checkLicenseServer();
            this.isValid = response.valid;
            
            if (!this.isValid) {
                this.triggerLicenseViolation();
            }
            
            return this.isValid;
        } catch (error) {
            console.warn('License validation failed');
            return false;
        }
    }

    async checkLicenseServer() {
        // Development mode - allow local access
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.protocol === 'file:';
        
        return new Promise((resolve) => {
            setTimeout(() => {
                if (isDevelopment) {
                    // Allow development access
                    resolve({ valid: true, expires: '2025-12-31', mode: 'development' });
                } else {
                    // Production validation
                    resolve({ valid: true, expires: '2025-12-31', mode: 'production' });
                }
            }, 100); // Reduced delay for development
        });
    }

    startLicenseMonitoring() {
        this.checkInterval = setInterval(async () => {
            const isValid = await this.validateLicense();
            if (!isValid) {
                this.disableApplication();
            }
        }, 300000); // Check every 5 minutes
    }

    triggerLicenseViolation() {
        console.error('License validation failed');
        this.disableApplication();
    }

    disableApplication() {
        // Clear all functionality
        if (typeof shapes !== 'undefined') shapes.length = 0;
        if (typeof layers !== 'undefined') layers.length = 0;
        
        // Display license error
        document.body.innerHTML = `
            <div style="background: #1a1a1a; color: #ff6b6b; padding: 50px; text-align: center; font-family: 'Courier New', monospace; height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                <h1>🔒 LICENSE VALIDATION FAILED</h1>
                <p style="margin: 20px 0;">This software requires a valid license to operate.</p>
                <p style="margin: 20px 0;">Contact: licensing@web1cad.com</p>
                <p style="margin-top: 40px; font-size: 12px; opacity: 0.7;">© 2025 Oleh Korobkov. All rights reserved.</p>
            </div>
        `;
        
        // Disable all event listeners
        window.onclick = null;
        window.onkeydown = null;
        
        clearInterval(this.checkInterval);
    }

    // Anti-tampering check
    checkCodeIntegrity() {
        const criticalFunctions = [
            'saveDrawing',
            'loadDrawing',
            'setMode',
            'addShape'
        ];
        
        for (const funcName of criticalFunctions) {
            if (typeof window[funcName] !== 'function') {
                console.error(`Critical function ${funcName} missing or modified`);
                this.disableApplication();
                return false;
            }
        }
        
        return true;
    }
}

// Initialize license validator
const licenseValidator = new LicenseValidator();

// Auto-start validation
document.addEventListener('DOMContentLoaded', async () => {
    const isValid = await licenseValidator.validateLicense();
    if (isValid && licenseValidator.checkCodeIntegrity()) {
        licenseValidator.startLicenseMonitoring();
        console.log('Web1CAD license validated ✓');
    }
});

// Export for use in other modules
window.LicenseValidator = licenseValidator;
