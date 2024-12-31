import { adminDb, admin } from "../../src/config/firebaseAdmin.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  let workoutId;
  try {
    // Check if event.body is defined and log it
    if (!event.body) {
      console.error("No request body provided");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No request body provided" }),
      };
    }

    // Log the event body for debugging
    console.log("Event body:", event.body);

    const parsedBody = JSON.parse(event.body);
    workoutId = parsedBody.workoutId;

    if (!workoutId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Workout ID is required" }),
      };
    }

    const token = event.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized: Missing token" }),
      };
    }

    // Verify the user token and get the user ID using admin.auth()
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const workoutRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("workouts")
      .doc(workoutId);

    await workoutRef.delete();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Error deleting workout:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to delete workout",
        details: error.message,
      }),
    };
  }
}
