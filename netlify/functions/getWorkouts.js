import { adminDb, admin } from '../../src/config/firebaseAdmin.js'; // Import the configured adminDb from firebaseAdmin.js
//import admin from 'firebase-admin'; // Import admin for authentication

export async function handler(event) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Extract the token from the Authorization header
        const userToken = event.headers.authorization?.split('Bearer ')[1];

        if (!userToken) {
            return { statusCode: 401, body: 'Unauthorized: Missing token' };
        }

        // Verify the token and decode it
        const decodedToken = await admin.auth().verifyIdToken(userToken);
        const userId = decodedToken.uid;

        if (!userId) {
            return { statusCode: 400, body: 'User ID required' };
        }

        // Access the Firestore database and retrieve workout data
        const workoutsSnapshot = await adminDb.collection('users').doc(userId).collection('workouts').get();

        if (workoutsSnapshot.empty) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, workouts: [] }),
            };
        }

        const workouts = workoutsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, workouts }),
        };
    } catch (error) {
        console.error('Error retrieving workouts:', error); // Added logging for error
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
}
