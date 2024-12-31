import { Calculator, Dumbbell, Hourglass, ListCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="border p-10">
      Dashboard
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:gap-5 gap-2 mb-20">
    <Link to="/bmi" className="p-5 bg-gray-50/75 border h-fit rounded-md hover:bg-blue-50 cursor-pointer group">
        <Calculator />
        <h1 className="text-lg font-semibold mt-3 text-white group-hover:text-black">BMI Calculator</h1>
        <p className="text-sm text-white group-hover:text-black">Calculate your BMI</p>
    </Link>

    <Link to="/workout" className="p-5 bg-gray-50/75 border h-fit rounded-md hover:bg-blue-50 cursor-pointer group">
        <Dumbbell />
        <h1 className="text-lg font-semibold mt-3 text-white group-hover:text-black">Workout Routines</h1>
        <p className="text-sm text-white group-hover:text-black">Create/Edit Workout Routines</p>
    </Link>

    <Link to="/calories" className="p-5 bg-gray-50/75 border h-fit rounded-md hover:bg-blue-50 cursor-pointer group">
        <ListCheck />
        <h1 className="text-lg font-semibold mt-3 text-white group-hover:text-black">Calorie Counter</h1>
        <p className="text-sm text-white group-hover:text-black">Calculate your calorie intake</p>
    </Link>

    <Link to="/progress" className="p-5 bg-gray-50/75 border h-fit rounded-md hover:bg-blue-50 cursor-pointer group">
        <Hourglass />
        <h1 className="text-lg font-semibold mt-3 text-white group-hover:text-black">Progress</h1>
        <p className="text-sm text-white group-hover:text-black">Log and view your progress</p>
    </Link>
</div>

    </div>
  )
}
