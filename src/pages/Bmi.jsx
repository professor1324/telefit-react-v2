import { useState, useEffect } from "react";

export default function Bmi() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState(0);
  const [bmiColor, setBmiColor] = useState("");

  useEffect(() => {
    countBmi();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, weight]);

  function countBmi() {
    const heightInMeters = parseFloat(height) / 100;
    const weightInKg = parseFloat(weight);

    if (isNaN(heightInMeters) || isNaN(weightInKg) || heightInMeters <= 0 || weightInKg <= 0) {
      setBmi(0);
      setBmiColor("");
      return;
    }

    const calculatedBmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(2);
    setBmi(parseFloat(calculatedBmi));

    if (calculatedBmi < 18) {
      setBmiColor("text-orange-400");
    } else if (calculatedBmi >= 18 && calculatedBmi < 23) {
      setBmiColor("text-green-700");
    } else if (calculatedBmi >= 23) {
      setBmiColor("text-red-600");
    }
  }

  return (
    <>
      <h1 className="text-2xl text-center mb-5 mt-10">BMI Calculator</h1>

      <div className="border p-5 rounded-md mx-auto max-w-lg bg-gray-50">
        <div className="mb-5 flex">
          <div className="flex text-sm me-5">
            <div className="rounded-full bg-orange-400 h-3 w-3 me-2 mt-1"></div>
            Underweight ({"< 18"})
          </div>
          <div className="flex text-sm me-5">
            <div className="rounded-full bg-green-600 h-3 w-3 me-2 mt-1"></div>
            Normal ({"18 - 23"})
          </div>
          <div className="flex text-sm">
            <div className="rounded-full bg-red-600 h-3 w-3 me-2 mt-1"></div>
            Overweight ({"> 23"})
          </div>
        </div>

        <label htmlFor="height" className="text-sm">Height (cm)</label>
        <input
          type="text"
          className="border input-bordered py-2 px-3 rounded-md w-full block mt-1 mb-5"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />

        <label htmlFor="weight" className="text-sm">Weight (kg)</label>
        <input
          type="text"
          className="border input-bordered py-2 px-3 rounded-md w-full block mt-1 mb-5"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <p className="text-center text-sm mt-4">Your BMI is:</p>
        <h2 className="text-center text-3xl font-medium">
          {bmi !== 0 ? (
            <>
              <span className={bmiColor}>{bmi}</span>
            </>
          ) : (
            ""
          )}
        </h2>
      </div>
    </>
  );
}
