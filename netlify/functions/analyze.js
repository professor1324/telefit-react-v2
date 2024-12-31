import sharp from 'sharp';
import Clarifai from 'clarifai';
import axios from 'axios';
import {Buffer} from 'buffer';

const clarifaiApp = new Clarifai.App({
    apiKey: process.env.VITE_CLARIFAI_API_KEY,
});

export const handler = async (event) => {
    try {
        // Parse the binary data from the event body
        const contentType = event.headers['content-type'];
        if (contentType.startsWith('multipart/form-data')) {
            const boundary = contentType.split('boundary=')[1];
            const body = Buffer.from(event.body, 'base64').toString('binary');
            const parts = body.split(`--${boundary}`);
            const part = parts.find(p => p.includes('Content-Disposition: form-data; name="image";'));
            const fileData = part.split('\r\n\r\n')[1].split('\r\n--')[0];

            const buffer = Buffer.from(fileData, 'binary');

            const preprocessedImage = await sharp(buffer)
                .resize(500, 500)
                .normalize()
                .toBuffer();

            const base64Image = preprocessedImage.toString('base64');

            const clarifaiResponse = await clarifaiApp.models.predict(Clarifai.FOOD_MODEL, { base64: base64Image });
            const foodItems = clarifaiResponse.outputs[0].data.concepts
                .filter(concept => concept.value > 0.85)
                .map(concept => concept.name);

            const results = [];
            let totalCalories = 0;

            for (const item of foodItems) {
                const nutritionInfo = await getNutritionalInfo(item);
                const caloriesPer100g = nutritionInfo.calories || 0;
                totalCalories += caloriesPer100g;
                results.push({
                    ingredient: item,
                    quantity: '100g',
                    calories: caloriesPer100g,
                });
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ results, totalCalories }),
            };
        } else {
            return {
                statusCode: 400,
                body: 'Invalid content type. Expected multipart/form-data.',
            };
        }
    } catch (error) {
        console.error('Error analyzing image:', error);
        return {
            statusCode: 500,
            body: 'Error analyzing image.',
        };
    }
};

async function getNutritionalInfo(foodItem) {
    const url = `https://api.edamam.com/api/nutrition-data?app_id=${process.env.VITE_EDAMAM_APP_ID}&app_key=${process.env.VITE_EDAMAM_APP_KEY}&ingr=${encodeURIComponent('100g ' + foodItem)}`;
    const response = await axios.get(url);
    return response.data;
}
