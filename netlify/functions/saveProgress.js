import { adminDb, admin } from '../../src/config/firebaseAdmin.js'; // Import adminDb and admin

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Parse request body
        const requestBody = JSON.parse(event.body);
        console.log('Parsed request body:', requestBody);

        // Extract parameters
        const { userId, date, selectedWorkouts, selectedFoods, caloricIntake } = requestBody;

        // Log received values
        console.log('User ID:', userId);
        console.log('Date:', date);
        console.log('Selected Workouts:', selectedWorkouts);
        console.log('Selected Foods:', selectedFoods);
        console.log('Caloric Intake:', caloricIntake);

        // Validate input
        if (!userId || !date || !Array.isArray(selectedWorkouts) || !Array.isArray(selectedFoods) || typeof caloricIntake !== 'number') {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid input data' }),
            };
        }

        const progressRef = adminDb.collection('users').doc(userId).collection('progress').doc(date);

        // Save progress data
        await progressRef.set({
            workouts: selectedWorkouts,
            foods: selectedFoods,
            totalCalories: caloricIntake,
            date: new Date().toISOString(), // Current timestamp
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Progress saved successfully' }),
        };
    } catch (error) {
        console.error('Error saving progress:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to save progress', details: error.message }),
        };
    }
};
