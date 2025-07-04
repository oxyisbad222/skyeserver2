import B2 from 'b2-node';

const b2 = new B2({
    applicationKeyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APP_KEY
});

export default async function handler(req, res) {
     if (req.method !== 'POST') {
        return res.status(405).end('Method Not Allowed');
    }
    
    try {
        await b2.authorize(); // Must authorize before use

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
