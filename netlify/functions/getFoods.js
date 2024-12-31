import { adminDb, admin } from "../../src/config/firebaseAdmin.js"; // Import the configured adminDb

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const userToken = event.headers.authorization?.split("Bearer ")[1];

    if (!userToken) {
      return { statusCode: 401, body: "Unauthorized: Missing token" };
    }

    const decodedToken = await admin.auth().verifyIdToken(userToken);
    const userId = decodedToken.uid;

    if (!userId) {
      return { statusCode: 400, body: "User ID required" };
    }

    const foodsSnapshot = await adminDb
      .collection("users")
      .doc(userId)
      .collection("foods")
      .get();

    if (foodsSnapshot.empty) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, foods: [] }),
      };
    }

    const foods = foodsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, foods }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
}
