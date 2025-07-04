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
    // Set CORS headers to allow requests from your frontend.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request for CORS.
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
