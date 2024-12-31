import React, { useState, useEffect } from "react";
import axios from "axios";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function ProgressPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [workouts, setWorkouts] = useState([]);
  const [foods, setFoods] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState("");
  const [selectedFood, setSelectedFood] = useState("");
  const [customWorkout, setCustomWorkout] = useState({
    name: "",
    caloriesBurned: "",
  });
  const [customFood, setCustomFood] = useState({
    foodName: "",
    totalCalories: "",
  });
  const [loggedWorkouts, setLoggedWorkouts] = useState([]);
  const [loggedFoods, setLoggedFoods] = useState([]);
  const [noData, setNoData] = useState(false); // Ensure to define noData
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        await fetchWorkouts(user);
        await fetchFoods(user);
        await fetchProgressForDate(user, date); // Fetch data for initial date
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProgressForDate(user, date);
    }
  }, [date, user]);

  const fetchWorkouts = async (user) => {
    try {
      const token = await user.getIdToken();
      const response = await axios.get("/.netlify/functions/getWorkouts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setWorkouts(response.data.workouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
    }
  };

  const fetchFoods = async (user) => {
    try {
      const token = await user.getIdToken();
      const response = await axios.get("/.netlify/functions/getFoods", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setFoods(response.data.foods);
    } catch (error) {
      console.error("Error fetching foods:", error);
    }
  };

  const fetchProgressForDate = async (user, date) => {
    try {
      const token = await user.getIdToken();
      const response = await axios.get("/.netlify/functions/getProgress", {
        params: { date },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Fetched Progress Data:", response.data); // Debug line

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const { workouts = [], foods = [], totalCalories = 0 } = response.data;

      console.log("Workouts:", workouts); // Debug line
      console.log("Foods:", foods); // Debug line

      if (workouts.length === 0 && foods.length === 0) {
        setLoggedWorkouts([]);
        setLoggedFoods([]);
        setNoData(true);
      } else {
        setLoggedWorkouts(workouts);
        setLoggedFoods(foods);
        setNoData(false);
      }
    } catch (error) {
      console.error("Error fetching progress for date:", error);
      setLoggedWorkouts([]);
      setLoggedFoods([]);
      setNoData(true); // Show no data found message if there's an error
    }
  };

  const handleWorkoutChange = (e) => {
    const workoutName = e.target.value;
    setSelectedWorkout(workoutName);

    const selected = workouts.find((w) => w.name === workoutName);
    if (selected) {
      setCustomWorkout({
        name: selected.name,
        caloriesBurned: selected.caloriesBurned || "",
      });
    } else {
      setCustomWorkout({ name: "", caloriesBurned: "" });
    }
  };

  const handleFoodChange = (e) => {
    const foodName = e.target.value;
    setSelectedFood(foodName);

    const selected = foods.find((f) => f.foodName === foodName);
    if (selected) {
      setCustomFood({
        foodName: selected.foodName,
        totalCalories: selected.totalCalories || "",
      });
    } else {
      setCustomFood({ foodName: "", totalCalories: "" });
    }
  };

  const handleAddWorkout = () => {
    if (customWorkout.name && customWorkout.caloriesBurned) {
      if (
        isNaN(customWorkout.caloriesBurned) ||
        customWorkout.caloriesBurned <= 0
      ) {
        alert("Please enter a valid number for calories burned.");
        return;
      }
      setLoggedWorkouts([...loggedWorkouts, customWorkout]);
      setCustomWorkout({ name: "", caloriesBurned: "" });
    } else {
      alert("Please provide a workout name and calories burned.");
    }
  };

  const handleAddFood = () => {
    if (customFood.foodName && customFood.totalCalories) {
      if (isNaN(customFood.totalCalories) || customFood.totalCalories <= 0) {
        alert("Please enter a valid number for total calories.");
        return;
      }
      setLoggedFoods([...loggedFoods, customFood]);
      setCustomFood({ foodName: "", totalCalories: "" });
    } else {
      alert("Please provide a food name and total calories.");
    }
  };

  const handleDeleteWorkout = (index) => {
    const updatedWorkouts = loggedWorkouts.filter((_, i) => i !== index);
    setLoggedWorkouts(updatedWorkouts);
  };

  const handleDeleteFood = (index) => {
    const updatedFoods = loggedFoods.filter((_, i) => i !== index);
    setLoggedFoods(updatedFoods);
  };

  const calculateTotalCalories = (foods) => {
    return foods.reduce((total, food) => total + (food.totalCalories || 0), 0);
  };

  const handleSaveProgress = async () => {
    try {
      const token = await user.getIdToken();
      await axios.post(
        "/.netlify/functions/saveProgress",
        {
          userId: user.uid,
          date,
          selectedWorkouts: loggedWorkouts,
          selectedFoods: loggedFoods,
          caloricIntake: calculateTotalCalories(loggedFoods),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      alert("Progress saved successfully!");
    } catch (error) {
      console.error("Error saving progress:", error);
      alert("Failed to save progress.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full p-8 shadow-md rounded-lg">
        <h1 className="text-2xl font-semibold text-center">
          Log Your Daily Progress
        </h1>

        <div className="mt-4">
          <label
            htmlFor="date"
            className="block text-lg font-medium text-gray-700"
          >
            Date:
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 block w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        {noData && (
          <div className="mt-4 text-center text-red-600">
            No data found for the selected date.
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold">Workouts</h2>
          <div className="flex mt-4">
            <select
              value={selectedWorkout}
              onChange={handleWorkoutChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select a workout</option>
              {workouts.map((workout, index) => (
                <option key={index} value={workout.name}>
                  {workout.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Custom workout name"
              value={customWorkout.name}
              onChange={(e) =>
                setCustomWorkout({ ...customWorkout, name: e.target.value })
              }
              className="ml-2 w-full p-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              placeholder="Calories (kcal)"
              value={customWorkout.caloriesBurned}
              onChange={(e) =>
                setCustomWorkout({
                  ...customWorkout,
                  caloriesBurned: e.target.value,
                })
              }
              className="ml-2 w-full p-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={handleAddWorkout}
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Add
            </button>
          </div>

          <table className="mt-4 w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b px-4 py-2">Workout</th>
                <th className="border-b px-4 py-2">Calories (kcal)</th>
                <th className="border-b px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loggedWorkouts.map((workout, index) => (
                <tr key={index}>
                  <td className="border-b px-4 py-2">{workout.name}</td>
                  <td className="border-b px-4 py-2">
                    {workout.caloriesBurned}
                  </td>
                  <td className="border-b px-4 py-2">
                    <button
                      onClick={() => handleDeleteWorkout(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold">Foods</h2>
          <div className="flex mt-4">
            <select
              value={selectedFood}
              onChange={handleFoodChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select a food</option>
              {foods.map((food, index) => (
                <option key={index} value={food.foodName}>
                  {food.foodName}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Custom food name"
              value={customFood.foodName}
              onChange={(e) =>
                setCustomFood({ ...customFood, foodName: e.target.value })
              }
              className="ml-2 w-full p-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              placeholder="Total calories"
              value={customFood.totalCalories}
              onChange={(e) =>
                setCustomFood({ ...customFood, totalCalories: e.target.value })
              }
              className="ml-2 w-full p-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={handleAddFood}
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Add
            </button>
          </div>

          <table className="mt-4 w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b px-4 py-2">Food</th>
                <th className="border-b px-4 py-2">Calories</th>
                <th className="border-b px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loggedFoods.map((food, index) => (
                <tr key={index}>
                  <td className="border-b px-4 py-2">{food.foodName}</td>
                  <td className="border-b px-4 py-2">{food.totalCalories}</td>
                  <td className="border-b px-4 py-2">
                    <button
                      onClick={() => handleDeleteFood(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleSaveProgress}
            className="px-4 py-2 bg-green-600 text-white rounded-md"
          >
            Save Progress
          </button>
        </div>
      </div>
    </div>
  );
}
