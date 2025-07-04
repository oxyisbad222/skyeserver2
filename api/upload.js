/*
 * =================================================================================
 * File: /api/upload.js (Updated)
 * Description: Gets a secure, one-time upload URL from Backblaze B2.
 * =================================================================================
 */
import B2 from 'b2-node';

// Check for required environment variables at startup to prevent runtime errors.
if (!process.env.B2_KEY_ID || !process.env.B2_APP_KEY || !process.env.B2_BUCKET_ID) {
    throw new Error('CRITICAL: Backblaze B2 environment variables are not fully configured.');
}

const b2 = new B2({
    applicationKeyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APP_KEY
});

export default async function handler(req, res) {
    // Set CORS headers to allow requests from your frontend.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-control-allow-methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request for CORS.
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).end('Method Not Allowed');
    }
    
    try {
        // Authorize with B2 before requesting an upload URL.
        await b2.authorize();

        const response = await b2.getUploadUrl({
            bucketId: process.env.B2_BUCKET_ID,
        });

        res.status(200).json({
            uploadUrl: response.data.uploadUrl,
            authorizationToken: response.data.authorizationToken,
        });
    } catch (error) {
        console.error('B2 Upload URL Error:', error);
        res.status(500).json({ message: 'Failed to get upload URL from storage provider.' });
    }
}
