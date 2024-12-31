import { admin, adminDb } from '../../src/config/firebaseAdmin.js';
import crypto from 'crypto';

// Helper function to validate the Telegram hash
function validateTelegramHash(data, hash) {
    const secret = crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN).digest();
    const dataCheckString = Object.entries(data)
        .filter(([key]) => key !== 'hash')
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    const computedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
    return computedHash === hash;
}

// Action handlers
const actions = {
    getTelegramId: async (userId) => {
        try {
            const userRef = adminDb.collection('users').doc(userId);
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'User not found' }),
                };
            }
            const userData = userDoc.data();
            return {
                statusCode: 200,
                body: JSON.stringify({ telegramId: userData.telegramId || null }),
            };
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Error fetching Telegram ID: ${error.message}` }),
            };
        }
    },

    linkTelegram: async (userId, telegramData) => {
        const { hash, ...data } = telegramData;

        const isValid = validateTelegramHash(data, hash);
        if (!isValid) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized: Invalid Telegram hash' }),
            };
        }

        try {
            const usersRef = adminDb.collection('users');
            const querySnapshot = await usersRef.where('telegramId', '==', data.id).get();

            if (!querySnapshot.empty) {
                return {
                    statusCode: 409,
                    body: JSON.stringify({ error: 'Telegram ID already in use' }),
                };
            }

            const userRef = adminDb.collection('users').doc(userId);
            await userRef.update({ telegramId: String(data.id) });

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Telegram account linked successfully' }),
            };
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Error linking Telegram ID: ${error.message}` }),
            };
        }
    },

    unlinkTelegram: async (userId) => {
        try {
            const userRef = adminDb.collection('users').doc(userId);
            await userRef.update({ telegramId: null });

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Telegram account unlinked successfully' }),
            };
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Error unlinking Telegram ID: ${error.message}` }),
            };
        }
    },

    changePassword: async (userId, newPassword) => {
        try {
            await admin.auth().updateUser(userId, { password: newPassword });

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Password updated successfully' }),
            };
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message }),
            };
        }
    },
};

export const handler = async (event) => {
    let decodedToken;
    try {
        // Extract the token from the Authorization header
        const authHeader = event.headers.authorization || '';
        const token = authHeader.split('Bearer ')[1];
        
        if (!token) {
            console.log('No token provided');
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized: No token provided' }),
            };
        }

        // Verify the token
        decodedToken = await admin.auth().verifyIdToken(token);
        console.log('Token verified, UID:', decodedToken.uid);
    } catch (error) {
        console.log('Token verification failed:', error.message);
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        };
    }

    // Extract query parameters or body data depending on the method
    let { userId, action } = event.queryStringParameters || {};
    let requestBody = {};

    if (event.httpMethod === 'POST') {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid request: Missing body' }),
            };
        }

        try {
            requestBody = JSON.parse(event.body);
            userId = requestBody.userId;
            action = requestBody.action;
            console.log('Parsed body:', requestBody); // Log the parsed body
        } catch (error) {
            console.log('Failed to parse body:', error.message);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid request: Body is not valid JSON' }),
            };
        }
    }

    // Check that the userId matches the decoded token's UID
    if (!userId || userId !== decodedToken.uid) {
        console.log('User ID does not match token UID or is missing');
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Forbidden: User ID does not match token UID' }),
        };
    }

    if (!action) {
        console.log('Missing action');
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request: Missing action' }),
        };
    }

    // Execute the action
    const actionHandler = actions[action];
    if (typeof actionHandler === 'function') {
        try {
            return await actionHandler(userId, requestBody.telegramData || requestBody.newPassword);
        } catch (error) {
            console.error('Error during request processing:', error); // Log any processing errors
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message }),
            };
        }
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
};
