import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import FormData from "form-data";
import { adminDb, admin } from "../../src/config/firebaseAdmin";

// Initialize the bot with webhooks
console.log("Initializing bot with webhook...");
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  webHook: true,
});

// Set the webhook URL
bot
  .setWebHook(`${process.env.VITE_NETLIFY_FUNCTIONS_URL}/telegramBot`)
  .then(() => console.log("Webhook set successfully"))
  .catch((err) => console.error("Error setting webhook:", err));

let foodItems = [];
let currentContext = {}; // Track the current context of the conversation

// Firestore collection reference
const usersCollection = adminDb.collection("users");

// Load food items from Firestore
const loadFoodItems = async (chatId) => {
  const doc = await usersCollection.doc(chatId.toString()).get();
  if (doc.exists) {
    foodItems = doc.data().foodItems || [];
  } else {
    foodItems = [];
  }
};

// Save food items to Firestore
const saveFoodItems = async (chatId) => {
  await usersCollection.doc(chatId.toString()).set({
    foodItems: foodItems,
  });
};

// Webhook handler
export const handler = async (event) => {
  try {
      if (!event.body) {
          console.error('Webhook event body is missing');
          return {
              statusCode: 400,
              body: 'Bad Request: No event body',
          };
      }

      const body = JSON.parse(event.body);
      
      if (!body) {
          console.error('Parsed body is empty or invalid');
          return {
              statusCode: 400,
              body: 'Bad Request: Invalid JSON body',
          };
      }

      if (body.message) {
          await handleMessage(body.message);
      } else if (body.callback_query) {
          await handleCallbackQuery(body.callback_query);
      }

      return { statusCode: 200, body: 'Webhook received' };
  } catch (error) {
      console.error('Error processing webhook:', error);
      return {
          statusCode: 500,
          body: 'Internal Server Error',
      };
  }
};

// Handle incoming messages
const handleMessage = async (message) => {
  const chatId = message.chat.id;
  await loadFoodItems(chatId); // Load food items

  if (message.photo) {
    await processPhoto(chatId, message.photo);
  } else if (currentContext[chatId] && currentContext[chatId].action) {
    if (currentContext[chatId].action === "adjust") {
      await handleAdjustmentInput(chatId, message.text);
    } else if (currentContext[chatId].action === "add") {
      await handleAddIngredientInput(chatId, message.text);
    } else if (currentContext[chatId].action === "save_food_name") {
      await saveFoodToAccount(chatId, message.text);
    } else if (currentContext[chatId].action === "log_date") {
      await handleDateInput(chatId, message.text);
    }
  } else {
    await showMainMenu(chatId);
  }
};

// Handle callback queries from inline keyboard
const handleCallbackQuery = async (query) => {
  const chatId = query.message.chat.id;
  const action = query.data;

  await loadFoodItems(chatId); // Load food items before handling query

  if (action.startsWith("adjust_")) {
    const index = parseInt(action.split("_")[1]);
    await promptForAdjustment(chatId, index);
  } else if (action.startsWith("remove_")) {
    const index = parseInt(action.split("_")[1]);
    await removeIngredient(chatId, index);
  } else if (action.startsWith("viewworkout_")) {
    const workoutId = action.split("_")[1];
    await showWorkoutDetails(chatId, workoutId);
  } else if (action === "add_ingredient") {
    await promptForNewIngredient(chatId);
  } else if (action === "food_analysis") {
    await startFoodAnalysis(chatId);
  } else if (action === "save_food") {
    await checkTelegramId(chatId);
  } else if (action === "show_workouts") {
    await showWorkouts(chatId);
  } else if (action.startsWith("workout_")) {
    const workoutId = action.split("_")[1];
    await saveWorkoutLog(chatId, workoutId, currentContext[chatId].date); // Save the workout log
  } else if (action.startsWith("food_")) {
    const foodId = action.split("_")[1];
    await saveFoodLog(chatId, foodId, currentContext[chatId].date); // Save the food log
  } else if (action === "log_workout") {
    await logWorkout(chatId, currentContext[chatId].date);
  } else if (action === "log_food") {
    await logFood(chatId, currentContext[chatId].date);
  } else if (action === "daily_logging") {
    await startDailyLogging(chatId);
  } else if (action === "reset") {
    await showMainMenu(chatId);
  }
};

// Show the main menu with options
const showMainMenu = async (chatId) => {
  currentContext[chatId] = {}; // Clear context when showing the main menu
  const keyboard = [
    [{ text: "🍲 Food Analysis", callback_data: "food_analysis" }],
    [{ text: "💪 Workouts", callback_data: "show_workouts" }],
    [{ text: "📝 Daily Logging", callback_data: "daily_logging" }],
  ];
  await bot.sendMessage(chatId, "Welcome! Please choose an option:", {
    reply_markup: { inline_keyboard: keyboard },
  });
};

// Start Food Analysis flow
const startFoodAnalysis = async (chatId) => {
  await bot.sendMessage(
    chatId,
    "🖼 Please send an image of the food you want to analyze."
  );
};

// Process photo messages for food analysis
const processPhoto = async (chatId, photos) => {
  const photo = photos[photos.length - 1];
  await bot.sendMessage(chatId, "🔄 Analyzing your image, please wait...");

  try {
    const fileUrl = await getFileUrl(photo.file_id);
    const analysisResults = await analyzeImage(fileUrl);

    foodItems = analysisResults.results.map((item) => ({
      ingredient: item.ingredient,
      quantity: parseFloat(item.quantity),
      calories: parseFloat(item.calories),
    }));

    await saveFoodItems(chatId); // Save the analyzed food items

    await sendCalorieInfo(chatId);
  } catch (error) {
    console.error("Error processing photo:", error);
    await bot.sendMessage(
      chatId,
      "❌ Failed to analyze the image. Please try again later."
    );
  }
};

// Get file URL for the photo
const getFileUrl = async (fileId) => {
  const file = await bot.getFile(fileId);
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
};

// Analyze the image via external API
const analyzeImage = async (fileUrl) => {
  const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
  const formData = new FormData();
  formData.append("image", Buffer.from(response.data), "image.jpg");

  const analysisResponse = await axios.post(
    `https://${process.env.VITE_NETLIFY_FUNCTIONS_URL}/analyze`,
    formData,
    { headers: formData.getHeaders(), timeout: 20000 }
  );
  return analysisResponse.data;
};

// Send calorie information with options for further actions
const sendCalorieInfo = async (chatId) => {
  // Ensure all calorie values are numbers
  foodItems.forEach((item, index) => {
    if (isNaN(item.calories)) {
      console.error(`Invalid calorie value at index ${index}:`, item.calories);
      item.calories = 0; // Default to 0 if the value is not a valid number
    }
  });

  // Calculate total calories safely
  const totalCalories = foodItems
    .reduce((acc, item) => acc + parseFloat(item.calories), 0)
    .toFixed(2);
  const details = foodItems
    .map(
      (item, index) =>
        `${index + 1}. ${item.ingredient} - ${item.quantity}g: ${
          item.calories
        } calories`
    )
    .join("\n");

  const message = `✅ Analysis Complete!\n\n**Total Calories:** ${totalCalories}\n\n**Details:**\n${details}`;
  const keyboard = createInlineKeyboard();

  await bot.sendMessage(chatId, message, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard },
  });

  // Keep the context active for further adjustments after showing updated info
  currentContext[chatId].action = "adjusting";
};

// Create inline keyboard based on current food items
const createInlineKeyboard = () => {
  const itemButtons = foodItems.map((item, index) => [
    { text: `Adjust ${item.ingredient}`, callback_data: `adjust_${index}` },
    { text: `Remove ${item.ingredient}`, callback_data: `remove_${index}` },
  ]);
  itemButtons.push(
    [{ text: "➕ Add new ingredient", callback_data: "add_ingredient" }],
    [{ text: "💾 Save food info", callback_data: "save_food" }],
    [{ text: "🔄 Reset", callback_data: "reset" }],
    [{ text: "🖼 Analyze new image", callback_data: "new_image" }]
  );
  return itemButtons;
};

// Prompt for adjusting ingredient
const promptForAdjustment = async (chatId, index) => {
  const ingredient = foodItems[index].ingredient;
  currentContext[chatId] = { action: "adjust", index };
  await bot.sendMessage(
    chatId,
    `Enter the new quantity and calories for ${ingredient} in the format: Quantity(g), Calories`,
    {
      reply_markup: { remove_keyboard: true }, // Disable inline keyboard for text input
    }
  );
};

// Handle the user's input for adjusting an ingredient
const handleAdjustmentInput = async (chatId, input) => {
  const context = currentContext[chatId];
  const [newQuantity, newCalories] = input
    .split(",")
    .map((i) => parseFloat(i.trim()));

  if (
    context &&
    context.action === "adjust" &&
    !isNaN(newQuantity) &&
    !isNaN(newCalories)
  ) {
    foodItems[context.index].quantity = newQuantity;
    foodItems[context.index].calories = newCalories.toFixed(2); // Ensure it's stored as a string number

    await saveFoodItems(chatId); // Save the updated food items

    await bot.sendMessage(
      chatId,
      `✅ ${foodItems[context.index].ingredient} has been updated.`
    );

    // Send the updated calorie info and prompt for further adjustments
    await sendCalorieInfo(chatId);
  } else {
    await bot.sendMessage(
      chatId,
      "⚠️ Invalid input. Please enter the quantity and calories as numbers in the format: Quantity(g), Calories"
    );
  }
};

// Handle the user's input for adding a new ingredient
const handleAddIngredientInput = async (chatId, input) => {
  const [ingredient, quantity, calories] = input
    .split(",")
    .map((i) => i.trim());

  if (
    ingredient &&
    !isNaN(parseFloat(quantity)) &&
    !isNaN(parseFloat(calories))
  ) {
    foodItems.push({
      ingredient,
      quantity: parseFloat(quantity),
      calories: parseFloat(calories).toFixed(2), // Ensure it's stored as a string number
    });

    await saveFoodItems(chatId); // Save the new food item

    await bot.sendMessage(chatId, `✅ ${ingredient} has been added.`);

    // Send the updated calorie info and prompt for further adjustments
    await sendCalorieInfo(chatId);
  } else {
    await bot.sendMessage(
      chatId,
      "⚠️ Invalid input. Please ensure the quantity and calories are numbers and the format is: IngredientName, Quantity(g), Calories"
    );
  }
};

// Prompt for adding a new ingredient
const promptForNewIngredient = async (chatId) => {
  currentContext[chatId] = { action: "add" };
  await bot.sendMessage(
    chatId,
    "Please enter the new ingredient in the following format: IngredientName, Quantity(g), Calories",
    {
      reply_markup: { remove_keyboard: true }, // Disable inline keyboard for text input
    }
  );
};

// Remove an ingredient
const removeIngredient = async (chatId, index) => {
  const removedItem = foodItems.splice(index, 1);
  await saveFoodItems(chatId); // Save the updated food items after removal

  await bot.sendMessage(
    chatId,
    `🗑️ Removed ${removedItem[0].ingredient} from the list.`
  );

  // Send the updated calorie info and prompt for further adjustments
  await sendCalorieInfo(chatId);
};

// Check if the Telegram ID exists in the database
const checkTelegramId = async (chatId) => {
  const userDoc = await usersCollection
    .where("telegramId", "==", chatId.toString())
    .get();

  if (userDoc.empty) {
    await bot.sendMessage(
      chatId,
      "⚠️ You have not created an account yet. Please create an account first."
    );
  } else {
    currentContext[chatId] = { action: "save_food_name" };
    await bot.sendMessage(chatId, "Please enter a name for your food:");
  }
};

// Save food data to the user's account
const saveFoodToAccount = async (chatId, foodName) => {
  const userDoc = await usersCollection
    .where("telegramId", "==", chatId.toString())
    .get();

  if (!userDoc.empty) {
    const userId = userDoc.docs[0].id;

    // Calculate the total calories
    const totalCalories = foodItems
      .reduce((acc, item) => acc + parseFloat(item.calories), 0)
      .toFixed(2);

    // Save the food data with the total calories
    await usersCollection.doc(userId).collection("foods").add({
      foodName: foodName,
      totalCalories: totalCalories, // Add total calories to the document
      results: foodItems,
    });

    await bot.sendMessage(
      chatId,
      `✅ Food information saved as "${foodName}" with a total of ${totalCalories} calories.`
    );
    currentContext[chatId] = {}; // Clear context after saving
  } else {
    await bot.sendMessage(
      chatId,
      "⚠️ Error saving food information. Please try again."
    );
  }
};

// Show the user's workouts as inline keyboard buttons
const showWorkouts = async (chatId) => {
  const userDoc = await usersCollection
    .where("telegramId", "==", chatId.toString())
    .get();

  if (!userDoc.empty) {
    const userId = userDoc.docs[0].id;
    const workouts = await usersCollection
      .doc(userId)
      .collection("workouts")
      .get();

    if (workouts.empty) {
      await bot.sendMessage(chatId, "⚠️ You have no workouts saved.");
    } else {
      let keyboard = workouts.docs.map((doc) => {
        return [
          { text: doc.data().name, callback_data: `viewworkout_${doc.id}` },
        ];
      });

      // Add a reset button to return to the main menu
      keyboard.push([{ text: "🔄 Reset", callback_data: "reset" }]);

      await bot.sendMessage(chatId, "💪 Select a workout to view details:", {
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  } else {
    await bot.sendMessage(
      chatId,
      "⚠️ You have not created an account yet. Please create an account first."
    );
  }
};

// Show the details of a specific workout
const showWorkoutDetails = async (chatId, workoutId) => {
  const userDoc = await usersCollection
    .where("telegramId", "==", chatId.toString())
    .get();

  if (!userDoc.empty) {
    const userId = userDoc.docs[0].id;
    const workoutDoc = await usersCollection
      .doc(userId)
      .collection("workouts")
      .doc(workoutId)
      .get();

    if (workoutDoc.exists) {
      const workoutData = workoutDoc.data();
      let message = `🏋️ Workout: ${workoutData.name}\n`;
      message += `🔥 Calories Burned: ${workoutData.caloriesBurned}\n`;
      message += `Exercises:\n`;
      workoutData.exercises.forEach((exercise, index) => {
        message += `  ${index + 1}. ${exercise.name} - Reps: ${
          exercise.reps
        }, Sets: ${exercise.sets}\n`;
      });

      await bot.sendMessage(chatId, message);
      await showWorkouts(chatId);
    } else {
      await bot.sendMessage(chatId, "⚠️ This workout no longer exists.");
    }
  } else {
    await bot.sendMessage(
      chatId,
      "⚠️ You have not created an account yet. Please create an account first."
    );
  }
};

// Start Daily Logging flow
const startDailyLogging = async (chatId) => {
  currentContext[chatId] = { action: "log_date" };
  await bot.sendMessage(
    chatId,
    "📅 Please enter the date you want to log (YYYY-MM-DD):"
  );
};

// Handle date input
// Handle date input with validation
const handleDateInput = async (chatId, date) => {
  // Validate the date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegex.test(date)) {
      currentContext[chatId] = { action: 'log_type', date: date };
      const keyboard = [
          [{ text: 'Log Workout', callback_data: 'log_workout' }],
          [{ text: 'Log Food Intake', callback_data: 'log_food' }],
          [{ text: '🔄 Reset', callback_data: 'reset' }]
      ];
      await bot.sendMessage(chatId, `You've selected ${date}. What would you like to log?`, {
          reply_markup: { inline_keyboard: keyboard }
      });
  } else {
      await bot.sendMessage(chatId, '⚠️ Invalid date format. Please enter the date in the format YYYY-MM-DD.');
  }
};

// Log Workout
const logWorkout = async (chatId, date) => {
  const userDoc = await usersCollection
    .where("telegramId", "==", chatId.toString())
    .get();
  if (!userDoc.empty) {
    const userId = userDoc.docs[0].id;
    const workouts = await usersCollection
      .doc(userId)
      .collection("workouts")
      .get();

    if (workouts.empty) {
      await bot.sendMessage(
        chatId,
        "⚠️ You have no workouts saved. Please add a workout first."
      );
    } else {
      let keyboard = workouts.docs.map((doc) => {
        return [{ text: doc.data().name, callback_data: `workout_${doc.id}` }];
      });

      // Add a reset button to return to the main menu
      keyboard.push([{ text: "🔄 Reset", callback_data: "reset" }]);

      await bot.sendMessage(chatId, "💪 Select a workout to log:", {
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  } else {
    await bot.sendMessage(
      chatId,
      "⚠️ You have not created an account yet. Please create an account at telefit.netlify.app/register first."
    );
  }
};

// Log Food Intake
const logFood = async (chatId, date) => {
  const userDoc = await usersCollection
    .where("telegramId", "==", chatId.toString())
    .get();
  if (!userDoc.empty) {
    const userId = userDoc.docs[0].id;
    const foods = await usersCollection.doc(userId).collection("foods").get();

    if (foods.empty) {
      await bot.sendMessage(
        chatId,
        "⚠️ You have no food items saved. Please add food items first."
      );
    } else {
      let keyboard = foods.docs.map((doc) => {
        return [{ text: doc.data().foodName, callback_data: `food_${doc.id}` }];
      });

      // Add a reset button to return to the main menu
      keyboard.push([{ text: "🔄 Reset", callback_data: "reset" }]);

      await bot.sendMessage(chatId, "🍲 Select a food item to log:", {
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  } else {
    await bot.sendMessage(
      chatId,
      "⚠️ You have not created an account yet. Please create an account at telefit.netlify.app/register first."
    );
  }
};

// Save workout log to Firestore
const saveWorkoutLog = async (chatId, workoutId, date) => {
  const userDoc = await usersCollection.where('telegramId', '==', chatId.toString()).get();

  if (!userDoc.empty) {
      const userId = userDoc.docs[0].id;
      const workoutDoc = await usersCollection.doc(userId).collection('workouts').doc(workoutId).get();

      if (workoutDoc.exists) {
          const workoutData = workoutDoc.data();

          // Save the workout log under the progress subcollection
          await usersCollection.doc(userId).collection('progress').doc(date).set({
              workouts: admin.firestore.FieldValue.arrayUnion({
                  name: workoutData.name,
                  caloriesBurned: workoutData.caloriesBurned
              })
          }, { merge: true });

          await bot.sendMessage(chatId, `💪 Logged workout: ${workoutData.name} on ${date}.`);
          await showMainMenu(chatId); // Show the main menu after logging
      } else {
          await bot.sendMessage(chatId, '⚠️ This workout no longer exists.');
      }
  } else {
      await bot.sendMessage(chatId, '⚠️ You have not created an account yet. Please create an account at telefit.netlify.app/register first.');
  }
};

// Save food log to Firestore
const saveFoodLog = async (chatId, foodId, date) => {
  const userDoc = await usersCollection.where('telegramId', '==', chatId.toString()).get();

  if (!userDoc.empty) {
      const userId = userDoc.docs[0].id;
      const foodDoc = await usersCollection.doc(userId).collection('foods').doc(foodId).get();

      if (foodDoc.exists) {
          const foodData = foodDoc.data();

          // Save the food log under the progress subcollection
          await usersCollection.doc(userId).collection('progress').doc(date).set({
              foods: admin.firestore.FieldValue.arrayUnion({
                  foodName: foodData.foodName,
                  totalCalories: foodData.totalCalories
              })
          }, { merge: true });

          await bot.sendMessage(chatId, `🍲 Logged food: ${foodData.foodName} on ${date}.`);
          await showMainMenu(chatId); // Show the main menu after logging
      } else {
          await bot.sendMessage(chatId, '⚠️ This food item no longer exists.');
      }
  } else {
      await bot.sendMessage(chatId, '⚠️ You have not created an account yet. Please create an account at telefit.netlify.app/register first.');
  }
};
