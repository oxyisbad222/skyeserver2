/*
 * =================================================================================
 * File: /api/analytics.js (Updated)
 * Description: Gets dashboard analytics using the centralized db instance.
 * =================================================================================
 */
import { db } from './lib/firebase.js'; // Import the initialized db instance

export default async function handler(req, res) {
    // Set CORS headers to allow requests from your frontend.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request for CORS.
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'GET') {
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const contentSnapshot = await db.collection('content').get();
        const totalVideos = contentSnapshot.size;
        
        // Storage calculation would require B2 API calls and is complex.
        // Returning a placeholder is acceptable for this dashboard feature.
        const storageUsed = "N/A"; 

        res.status(200).json({
            totalVideos,
            storageUsed,
        });
    } catch (error) {
        console.error('API Error in /api/analytics:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
