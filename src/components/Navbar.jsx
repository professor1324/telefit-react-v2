import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { auth } from "../config/firebase";

export default function Navbar() {

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const location = useHistory();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setIsLoggedIn(!!user); // Set to true if user is logged in, false otherwise
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  async function signout() {
    await signOut(auth);
    location.push("/login");
  }

  return (
    <div className="navbar bg-base-100 py-4 px-6">
      <div className="flex-1">
        {/* Conditionally link to dashboard if logged in, else to home */}
        <Link to={isLoggedIn ? "/dashboard" : "/"} className="text-2xl text-blue-700 font-bold">
          TeleFit
        </Link>
      </div>

      <div className="flex-none space-x-6">
        {/* Links that are shown regardless of login status */}
        <Link to="/bmi" className="text-blue-700 hover:text-blue-900 px-2">
          BMI Calculator
        </Link>
        <Link to="/calories" className="text-blue-700 hover:text-blue-900 px-2">
          Calorie Counter
        </Link>

        {/* Additional links shown only when the user is logged in */}
        {isLoggedIn && (
          <>
            <Link to="/workout" className="text-blue-700 hover:text-blue-900 px-2">
              Workout Routines
            </Link>
            <Link to="/progress" className="text-blue-700 hover:text-blue-900 px-2">
              Progress Tracker
            </Link>
          </>
        )}
      </div>

      {isLoggedIn ? (
        <div className="flex-none space-x-4">
          <Link 
            to="/settings" 
            className="border border-blue-700 px-4 py-2 rounded-md text-sm text-blue-700 hover:bg-blue-50"
          >
            Settings
          </Link>
          <button 
            type="button" 
            className="border border-blue-700 px-4 py-2 rounded-md text-sm text-blue-700 hover:bg-blue-50"
            onClick={signout}
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="flex-none space-x-4">
          <Link to="/login" className="bg-blue-700 px-4 py-2 rounded-md text-sm text-white">
            Login
          </Link>
          <Link to="/register" className="bg-blue-100 px-4 py-2 rounded-md text-sm text-black">
            Register
          </Link>
        </div>
      )}
    </div>
  );
}
