import admin from 'firebase-admin';

// --- Initialize Firebase Admin SDK ---
// This needs the FIREBASE_SERVICE_ACCOUNT environment variable set in Vercel.
try {
    if (!admin.apps.length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
}

const db = admin.firestore();
const contentCollection = db.collection('content');
const B2_BUCKET_URL = `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}`;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow requests from any origin
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        switch (req.method) {
            case 'GET':
                const snapshot = await contentCollection.get();
                const contentList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return res.status(200).json(contentList);

            case 'POST':
                const { title, description, category, featured, thumbnail, fileName, source } = req.body;
                if (!title || !category || !fileName) {
                    return res.status(400).json({ message: 'Missing required fields.' });
                }
                const newContent = {
                    title,
                    description,
                    category,
                    featured,
                    thumbnail,
                    source,
                    videoUrl: `${B2_BUCKET_URL}/${encodeURIComponent(fileName)}`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };
                const docRef = await contentCollection.add(newContent);
                return res.status(201).json({ id: docRef.id, ...newContent });

            case 'DELETE':
                const { id } = req.query;
                if (!id) {
                    return res.status(400).json({ message: 'Content ID is required.' });
                }
                await contentCollection.doc(id).delete();
                // Note: Deleting the file from Backblaze B2 should also be handled here
                // for a complete solution, using the B2 SDK.
                return res.status(200).json({ message: 'Content deleted successfully.' });

            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error('API Error in /api/content:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
