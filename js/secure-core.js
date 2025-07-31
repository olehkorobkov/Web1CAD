/*
 * Secure Core Module - Web1CAD System
 * © 2025 Oleh Korobkov. All rights reserved.
 * This file contains encrypted proprietary algorithms
 */

// Encrypted core functionality
class SecureCore {
    constructor() {
        this.key = this.generateKey();
        this.encrypted = true;
    }

    // Generate encryption key based on browser fingerprint
    generateKey() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Web1CAD Security Check', 2, 2);
        
        const fingerprint = canvas.toDataURL() + 
                          navigator.userAgent + 
                          screen.width + screen.height + 
                          new Date().toDateString();
        
        return this.hashString(fingerprint);
    }

    // Simple hash function
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // Encrypt sensitive functions
    encryptFunction(func) {
        const funcStr = func.toString();
        const encrypted = btoa(funcStr); // Base64 encoding
        return encrypted;
    }

    // Decrypt and execute functions
    decryptAndExecute(encryptedFunc, ...args) {
        try {
            const decrypted = atob(encryptedFunc);
            const func = new Function('return ' + decrypted)();
            return func.apply(this, args);
        } catch (e) {
            console.error('Security violation detected');
            return null;
        }
    }

    // Validate execution environment
    validateEnvironment() {
        // Check if running on authorized domain
        const allowedDomains = ['localhost', '127.0.0.1', 'your-github-pages.io'];
        const currentDomain = window.location.hostname;
        
        if (!allowedDomains.includes(currentDomain)) {
            this.triggerSecurityLock();
            return false;
        }

        // Check for developer tools
        if (this.detectDevTools()) {
            this.triggerSecurityLock();
            return false;
        }

        return true;
    }

    // Detect developer tools
    detectDevTools() {
        let devtools = false;
        const threshold = 160;
        
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                devtools = true;
            }
        }, 500);
        
        return devtools;
    }

    // Security lock mechanism
    triggerSecurityLock() {
        // Clear all sensitive data
        if (typeof shapes !== 'undefined') shapes.length = 0;
        if (typeof layers !== 'undefined') layers.length = 0;
        
        // Display security message
        document.body.innerHTML = `
            <div style="background: #000; color: #f00; padding: 50px; text-align: center; font-family: monospace;">
                <h1>🔒 SECURITY VIOLATION DETECTED</h1>
                <p>Unauthorized access attempt blocked.</p>
                <p>© 2025 Oleh Korobkov. All rights reserved.</p>
            </div>
        `;
        
        // Disable further execution
        throw new Error('Security lock activated');
    }

    // Anti-debugging techniques
    antiDebug() {
        // Infinite debugger loop
        setInterval(() => {
            debugger;
        }, 100);

        // Console.log override
        const originalLog = console.log;
        console.log = function() {
            throw new Error('Console access blocked');
        };
    }
}

// Encrypted function storage
const ENCRYPTED_FUNCTIONS = {
    // Критичні функції у зашифрованому вигляді
    CORE_ALGORITHM: 'ZnVuY3Rpb24gY29yZUFsZ29yaXRobSgpIHsgcmV0dXJuICJTZWNyZXQgYWxnb3JpdGhtIjsgfQ==',
    FILE_ENCRYPTION: 'ZnVuY3Rpb24gZW5jcnlwdEZpbGUoZGF0YSkgeyByZXR1cm4gYnRvYShKU09OLnN0cmluZ2lmeShkYXRhKSk7IH0=',
    VALIDATION: 'ZnVuY3Rpb24gdmFsaWRhdGVMaWNlbnNlKCkgeyByZXR1cm4gdHJ1ZTsgfQ=='
};

// Initialize security
const secureCore = new SecureCore();

// Export secure interface
window.SecureCAD = {
    init: () => secureCore.validateEnvironment(),
    encrypt: (data) => secureCore.encryptFunction(data),
    execute: (func, ...args) => secureCore.decryptAndExecute(func, ...args)
};

// Anti-tampering protection
Object.freeze(window.SecureCAD);
Object.seal(secureCore);
