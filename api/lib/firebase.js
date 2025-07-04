/*
 * =================================================================================
 * File: /api/lib/firebase.js (New Helper File)
 * Description: Centralized Firebase Admin SDK initialization. This ensures the SDK
 * is initialized only once and provides a single source for the database instance,
 * fixing the 500 Internal Server Errors.
 * =================================================================================
 */
import admin from 'firebase-admin';

// Check if the service account key is available in environment variables.
// This is the most common source of 500 errors.
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('CRITICAL: The FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
}

// Initialize Firebase Admin SDK only if it hasn't been already.
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
        console.error('Firebase Admin Initialization Error:', error.message);
        // Throw a more specific error to help with debugging in Vercel logs.
        throw new Error('Failed to parse or initialize Firebase service account. Please verify the FIREBASE_SERVICE_ACCOUNT environment variable format in Vercel.');
    }
}

// Export the initialized Firestore instance for use in other API files.
export const db = admin.firestore();
