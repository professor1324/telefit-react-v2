import React, { useState, useEffect } from 'react';
import { getAuth } from "firebase/auth";
import axios from 'axios';

export default function WorkoutPage() {
    const [workoutName, setWorkoutName] = useState('');
    const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
    const [exercises, setExercises] = useState([{ name: '', reps: '', sets: '' }]);
    const [caloriesBurned, setCaloriesBurned] = useState('');
    const [workouts, setWorkouts] = useState([]);
    const [message, setMessage] = useState('');

    const auth = getAuth();

    const fetchWorkouts = async () => {
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.get('/.netlify/functions/getWorkouts', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                setWorkouts(response.data.workouts);
            } else {
                setMessage('Failed to fetch workouts.');
            }
        } catch (error) {
            setMessage(`Error fetching workouts: ${error.message}`);
        }
    };

    useEffect(() => {
        fetchWorkouts();
    }, [auth]);

    const handleWorkoutSelection = (event) => {
        const workoutId = event.target.value;

        if (workoutId === 'new') {
            // Reset fields for creating a new workout
            setSelectedWorkoutId('');
            setWorkoutName('');
            setExercises([{ name: '', reps: '', sets: '' }]);
            setCaloriesBurned('');
        } else {
            const selectedWorkout = workouts.find(workout => workout.id === workoutId);
            setSelectedWorkoutId(selectedWorkout.id);
            setWorkoutName(selectedWorkout.name);
            setExercises(selectedWorkout.exercises || [{ name: '', reps: '', sets: '' }]);
            setCaloriesBurned(selectedWorkout.caloriesBurned || '');
        }
    };

    const handleExerciseChange = (index, event) => {
        const newExercises = [...exercises];
        newExercises[index][event.target.name] = event.target.value;
        setExercises(newExercises);
    };

    const addExerciseField = () => {
        setExercises([...exercises, { name: '', reps: '', sets: '' }]);
    };

    const removeExerciseField = (index) => {
        const newExercises = exercises.filter((_, i) => i !== index);
        setExercises(newExercises);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!workoutName || !caloriesBurned) {
            setMessage('Please enter a workout name and estimated calories burned.');
            return;
        }

        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.post('/.netlify/functions/saveWorkout', {
                workoutName,
                exercises,
                caloriesBurned,
                workoutId: selectedWorkoutId,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                setMessage('Workout saved successfully!');
                setWorkoutName('');
                setExercises([{ name: '', reps: '', sets: '' }]);
                setCaloriesBurned('');
                setSelectedWorkoutId('');
                // Refresh the workout list after saving
                fetchWorkouts();
            } else {
                setMessage('Failed to save workout.');
            }
        } catch (error) {
            setMessage(`Error saving workout: ${error.message}`);
        }
    };

    const handleDelete = async () => {
        if (!selectedWorkoutId) {
            setMessage('No workout selected to delete.');
            return;
        }

        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.post('/.netlify/functions/deleteWorkout', {
                workoutId: selectedWorkoutId,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                setMessage('Workout deleted successfully!');
                setWorkoutName('');
                setExercises([{ name: '', reps: '', sets: '' }]);
                setCaloriesBurned('');
                setSelectedWorkoutId('');
                fetchWorkouts();
            } else {
                setMessage('Failed to delete workout.');
            }
        } catch (error) {
            setMessage(`Error deleting workout: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen  p-10">
            <div className="max-w-2xl mx-auto  shadow-md rounded-lg p-6">
                <h1 className="text-3xl font-bold mb-5 text-center">Manage Your Workouts</h1>

                <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700">Select Existing Workout or Create New</label>
                    <select
                        value={selectedWorkoutId || 'new'}
                        onChange={handleWorkoutSelection}
                        className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                    >
                        <option value="new">Create a new workout</option>
                        {workouts.map((workout) => (
                            <option key={workout.id} value={workout.id}>
                                {workout.name}
                            </option>
                        ))}
                    </select>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700">Workout Name</label>
                        <input
                            type="text"
                            value={workoutName}
                            onChange={(e) => setWorkoutName(e.target.value)}
                            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                        />
                    </div>

                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700">Estimated Total Calories Burned</label>
                        <input
                            type="number"
                            value={caloriesBurned}
                            onChange={(e) => setCaloriesBurned(e.target.value)}
                            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                        />
                    </div>

                    {exercises.map((exercise, index) => (
                        <div key={index} className="mb-5 p-4  rounded-md">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Exercise {index + 1}</h3>
                                <button type="button" onClick={() => removeExerciseField(index)} className="text-red-500 hover:text-red-700">
                                    Remove
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Exercise Name"
                                    value={exercise.name}
                                    onChange={(e) => handleExerciseChange(index, e)}
                                    className="border border-gray-300 rounded-md p-2"
                                />
                                <input
                                    type="number"
                                    name="reps"
                                    placeholder="Reps"
                                    value={exercise.reps}
                                    onChange={(e) => handleExerciseChange(index, e)}
                                    className="border border-gray-300 rounded-md p-2"
                                />
                                <input
                                    type="number"
                                    name="sets"
                                    placeholder="Sets"
                                    value={exercise.sets}
                                    onChange={(e) => handleExerciseChange(index, e)}
                                    className="border border-gray-300 rounded-md p-2"
                                />
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addExerciseField} className="bg-green-500 text-white px-4 py-2 rounded-md shadow hover:bg-green-600">
                        Add Exercise
                    </button>
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md shadow hover:bg-blue-600 mt-4">
                        Save Workout
                    </button>
                    {selectedWorkoutId && (
                        <button type="button" onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-md shadow hover:bg-red-600 mt-4">
                            Delete Workout
                        </button>
                    )}
                </form>
                {message && (
                    <div className="mt-5 text-center text-red-500">
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
