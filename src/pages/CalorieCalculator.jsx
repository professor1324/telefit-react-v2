import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function CalorieCalculator() {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [results, setResults] = useState(null);
    const [totalCalories, setTotalCalories] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [foodName, setFoodName] = useState(''); // State for food name

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user);
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        setImage(file);
        setImagePreview(URL.createObjectURL(file));  // Display the image preview
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setResults(null);

        const formData = new FormData();
        formData.append('image', image);

        try {
            const response = await fetch('/.netlify/functions/analyze', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to analyze image.');
            }

            const data = await response.json();
            setResults(data.results.map(result => ({
                ...result,
                quantity: parseFloat(result.quantity), // Ensure quantity is a number
                unit: 'g', // Assume the unit is grams for simplicity
                caloriesPerUnit: result.calories / parseFloat(result.quantity) // Calculate calories per unit
            })));
            setTotalCalories(data.totalCalories);
        } catch (error) {
            setError('Error analyzing image.');
            console.error('Error analyzing image:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuantityChange = (index, event) => {
        const newResults = [...results];
        const newQuantity = parseFloat(event.target.value) || 0; // Ensure newQuantity is a number or default to 0
    
        // Calculate the new calories based on quantity and caloriesPerUnit
        const caloriesPerUnit = parseFloat(newResults[index].caloriesPerUnit) || 0; // Default to 0 if caloriesPerUnit is undefined
        newResults[index].quantity = newQuantity.toFixed(2); // Ensure the quantity has two significant figures
        newResults[index].calories = (caloriesPerUnit * newQuantity).toFixed(2); // Ensure calories have two significant figures
    
        setResults(newResults);
        recalculateTotalCalories(newResults);
    };
    
    const recalculateTotalCalories = (results) => {
        const total = results.reduce((sum, item) => sum + parseFloat(item.calories || 0), 0);
        setTotalCalories(total.toFixed(2)); // Ensure total calories have two significant figures
    };
    
    const handleDeleteRow = (index) => {
        const newResults = results.filter((_, i) => i !== index);
        setResults(newResults);
        recalculateTotalCalories(newResults);
    };

    const handleSaveCalorieInput = async () => {
        if (!foodName.trim()) {
            setError('Please enter a name for the food.');
            return;
        }

        setError(null);
    
        try {
            const token = await user.getIdToken();
    
            const response = await fetch('/.netlify/functions/saveCalorieInput', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId: user.uid,
                    foodName, // Include food name
                    results, // Send all food items
                    totalCalories,
                }),
            });
    
            if (!response.ok) {
                throw new Error('Failed to save calorie input.');
            }
    
            setError('Calorie input saved successfully.');
        } catch (error) {
            setError(`Failed to save calorie input: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
            <div className="max-w-3xl w-full bg-base-100 p-8 shadow-md rounded-lg">
                <h1 className="text-2xl font-semibold text-center">Calorie Calculator</h1>
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="flex justify-center">
                        <label className="w-64 flex flex-col items-center px-4 py-6 bg-base-100 rounded-lg shadow-lg tracking-wide uppercase border border-blue cursor-pointer hover:bg-blue-500 hover:text-white transition-all">
                            <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M16.5 6.6l-4.6 4.6c-.2.2-.4.4-.7.4s-.5-.1-.7-.4L5.5 6.6c-.4-.4-.4-1 0-1.4.4-.4 1-.4 1.4 0l3.8 3.8 3.8-3.8c.4-.4 1-.4 1.4 0s.4 1 0 1.4z" />
                            </svg>
                            <span className="mt-2 text-base leading-normal">Select an image</span>
                            <input type="file" className="hidden" onChange={handleImageUpload} required />
                        </label>
                    </div>

                    {imagePreview && (
                        <div className="mt-4 text-center">
                            <img src={imagePreview} alt="Uploaded Preview" className="rounded-md max-w-full h-auto" />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-all"
                    >
                        {loading ? "Analyzing..." : "Analyze"}
                    </button>
                </form>

                {error && <p className="mt-4 text-red-500 text-center">{error}</p>}

                {results && (
                    <div id="results" className="mt-8">
                        <h2 className="text-xl font-semibold">Calories Information</h2>
                        <table className="mt-4 w-full table-auto border-collapse">
                            <thead>
                                <tr>
                                    <th className="border px-4 py-2 text-left">Ingredient</th>
                                    <th className="border px-4 py-2 text-left">Quantity</th>
                                    <th className="border px-4 py-2 text-left">Calories</th>
                                    <th className="border px-4 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result, index) => (
                                    <tr key={index}>
                                        <td className="border px-4 py-2">{result.ingredient}</td>
                                        <td className="border px-4 py-2">
                                            <div className="flex items-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={result.quantity}
                                                    onChange={(e) => handleQuantityChange(index, e)}
                                                    className="border w-full px-2 py-1 rounded-md"
                                                />
                                                <span className="ml-2">{result.unit}</span>
                                            </div>
                                        </td>
                                        <td className="border px-4 py-2">{result.calories}</td>
                                        <td className="border px-4 py-2 text-center">
                                            <button
                                                onClick={() => handleDeleteRow(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-6 text-lg font-semibold">
                            Total Calories: <span className="text-blue-600">{totalCalories}</span>
                        </div>
                    </div>
                )}

                {/* Food Name Input Field */}
                {user && results && (
                    <div className="mt-6">
                        <label htmlFor="foodName" className="block text-sm font-medium text-gray-700">Food Name</label>
                        <input
                            type="text"
                            id="foodName"
                            value={foodName}
                            onChange={(e) => setFoodName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter a name for the food"
                        />
                    </div>
                )}

                {/* Save Calorie Input Button */}
                {user && results && (
                    <button
                        onClick={handleSaveCalorieInput}
                        className="mt-6 w-full py-3 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition-all"
                    >
                        Save Calorie Input
                    </button>
                )}
            </div>
        </div>
    );
}
