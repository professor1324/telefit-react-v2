import crypto from 'crypto';
import { adminDb } from '../../src/config/firebaseAdmin.js'; // Adjust the path if needed

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

export async function handler(event) {
    const { queryStringParameters } = event;
    const { hash, ...data } = queryStringParameters;

    // Validate the Telegram hash
    const isValid = validateTelegramHash(data, hash);
    if (!isValid) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized: Invalid Telegram hash' }),
        };
    }

    try {
        // Check if the Telegram ID already exists in Firestore
        const usersRef = adminDb.collection('users');
        const querySnapshot = await usersRef.where('telegramId', '==', data.id).get();

        if (!querySnapshot.empty) {
            return {
                statusCode: 409, // Conflict status
                body: JSON.stringify({ error: 'Telegram ID already in use' }),
            };
        }

        // Return the Telegram ID to the client for further processing
        return {
            statusCode: 200,
            body: JSON.stringify({ id: data.id }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Error checking Telegram ID: ${error.message}` }),
        };
    }
}
