import { adminDb } from '../../src/config/firebaseAdmin.js';
import { getAuth } from 'firebase-admin/auth';

export async function handler(event) {
    try {
        const { workoutName, exercises, workoutId, caloriesBurned } = JSON.parse(event.body);
        const authToken = event.headers.authorization.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(authToken);
        const userId = decodedToken.uid;

        if (!workoutName || !caloriesBurned) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Workout name and calories burned are required' }),
            };
        }

        const workoutData = {
            name: workoutName,
            exercises,
            caloriesBurned: caloriesBurned,
            updatedAt: new Date().toISOString(),
        };

        const userRef = adminDb.collection('users').doc(userId);
        if (workoutId) {
            // Update existing workout
            await userRef.collection('workouts').doc(workoutId).set(workoutData, { merge: true });
        } else {
            // Add new workout
            await userRef.collection('workouts').add(workoutData);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };
    } catch (error) {
        console.error('Error saving workout:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to save workout' }),
        };
    }
}
