// src/functions/telegramLogin.js
import crypto from 'crypto';
import { adminDb, admin } from '../../src/config/firebaseAdmin.js'; // Adjust the path if needed
import { getAuth } from 'firebase-admin/auth';

// Function to validate the Telegram hash
function validateTelegramHash(data, hash) {
    console.log("Telegram Bot Token:", process.env.TELEGRAM_BOT_TOKEN);

    // Hash the bot token using SHA-256 to create the secret key
    const secret = crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN).digest();

    // Create the data check string by sorting and concatenating the data
    const dataCheckString = Object.entries(data)
        .filter(([key]) => key !== 'hash')
        .sort((a, b) => a[0].localeCompare(b[0])) // Ensure proper alphabetical sorting
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    console.log("Data Check String:", dataCheckString);

    // Generate the HMAC using the secret key and the data check string
    const computedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    console.log("Computed Hash:", computedHash);
    console.log("Received Hash:", hash);

    // Compare the computed hash with the hash received from Telegram
    return computedHash === hash;
}

// Main handler function
export async function handler(event) {
    const { queryStringParameters } = event;
    const { hash, ...data } = queryStringParameters;

    // Validate the Telegram hash
    const isValid = validateTelegramHash(data, hash);
    if (!isValid) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Unauthorized: Invalid Telegram hash" }),
        };
    }

    try {
        // Check if the Telegram ID already exists in Firestore
        const usersRef = adminDb.collection('users');
        const querySnapshot = await usersRef
            .where("telegramId", "==", data.id)
            .get();

        if (querySnapshot.empty) {
            return {
                statusCode: 409, // Conflict status
                body: JSON.stringify({ error: "Telegram ID not registered" }),
            };
        }

        const userDoc = querySnapshot.docs[0];
        const uid = userDoc.id;

        // Generate a custom Firebase token
        const customToken = await admin.auth().createCustomToken(uid);

        // Return the custom token to the client
        return {
            statusCode: 200,
            body: JSON.stringify({ id: data.id, customToken }),
        };
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Error checking Telegram ID: ${error.message}` }),
        };
    }
}
