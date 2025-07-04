/*
 * =================================================================================
 * File: /api/lib/firebase.js (New Helper File)
 * Description: Centralized Firebase Admin SDK initialization. This ensures the SDK
 * is initialized only once and provides a single source for the database instance.
 * =================================================================================
 */
import admin from 'firebase-admin';

// Check if the service account key is available in environment variables
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
}

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
        console.error('Firebase Admin Initialization Error:', error.message);
        // Throw a more specific error to help with debugging
        throw new Error('Failed to parse or initialize Firebase service account. Check the environment variable format.');
    }
}

// Export the initialized Firestore instance
export const db = admin.firestore();


/*
 * =================================================================================
 * File: /api/content.js (Updated)
 * Description: Manages content in Firestore using the centralized db instance.
 * =================================================================================
 */
import { db } from './lib/firebase.js'; // Import the initialized db instance

const B2_BUCKET_URL = `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}`;
const contentCollection = db.collection('content');

export default async function handler(req, res) {
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        switch (req.method) {
            case 'GET':
                const snapshot = await contentCollection.orderBy('createdAt', 'desc').get();
                const contentList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return res.status(200).json(contentList);

            case 'POST':
                const { title, description, category, featured, thumbnail, fileName, source } = req.body;
                if (!title || !category || !fileName) {
                    return res.status(400).json({ message: 'Missing required fields.' });
                }
                const newContent = {
                    title,
                    description: description || '',
                    category,
                    featured: featured || false,
                    thumbnail: thumbnail || '',
                    source,
                    videoUrl: `${B2_BUCKET_URL}/${encodeURIComponent(fileName)}`,
                    createdAt: new Date().toISOString()
                };
                const docRef = await contentCollection.add(newContent);
                return res.status(201).json({ id: docRef.id, ...newContent });

            case 'DELETE':
                const { id } = req.query;
                if (!id) {
                    return res.status(400).json({ message: 'Content ID is required.' });
                }
                await contentCollection.doc(id).delete();
                // Production enhancement: Also delete the file from Backblaze B2 here.
                return res.status(200).json({ message: 'Content deleted successfully.' });

            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error('API Error in /api/content:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

/*
 * =================================================================================
 * File: /api/upload.js (Updated)
 * Description: Gets a secure, one-time upload URL from Backblaze B2.
 * =================================================================================
 */
import B2 from 'b2-node';

// Check for required environment variables at startup
if (!process.env.B2_KEY_ID || !process.env.B2_APP_KEY || !process.env.B2_BUCKET_ID) {
    throw new Error('Backblaze B2 environment variables are not fully configured.');
}

const b2 = new B2({
    applicationKeyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APP_KEY
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).end('Method Not Allowed');
    }
    
    try {
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


/*
 * =================================================================================
 * File: /api/analytics.js (Updated)
 * Description: Gets dashboard analytics using the centralized db instance.
 * =================================================================================
 */
import { db } from './lib/firebase.js'; // Import the initialized db instance

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
