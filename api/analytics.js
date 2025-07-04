export default async function handler(req, res) {
    try {
        // Re-initialize if needed (Vercel can use different instances for functions)
        if (!admin.apps.length) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        
        const contentSnapshot = await admin.firestore().collection('content').get();
        const totalVideos = contentSnapshot.size;
        
        // Fetching storage used would require B2 API calls and is omitted for simplicity.
        // This can be added later by listing files in the bucket.
        const storageUsed = "N/A"; 

        res.status(200).json({
            totalVideos,
            storageUsed,
        });
    } catch (error) {
        console.error('API Error in /api/analytics:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
