import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../config/firebase";
import { useHistory } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [telegramId, setTelegramId] = useState(null);

  const history = useHistory();

  const login = () => {
    setIsLoading(true);
    setErrorMessage("");

    if (email !== "" && password !== "") {
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          if (userCredential) {
            setIsLoading(false);
            history.push("/dashboard");
          }
        })
        .catch((error) => {
          setIsLoading(false);
          console.error(`Error ${error.code}: ${error.message}`);
          setErrorMessage(`Error ${error.code}: ${error.message}`);
        });
    } else {
      setIsLoading(false);
      setErrorMessage("Email and password are required");
    }
  };

  const handleTelegramLogin = async (user) => {
    try {
      // Construct a query string from all user parameters except the hash
      const params = new URLSearchParams(user);
      params.delete("hash"); // The hash will be sent separately for validation

      // Add the hash separately for validation
      params.append("hash", user.hash);

      // Fetch the response from your Netlify function
      const response = await fetch(
        `/.netlify/functions/telegramLogin?${params.toString()}`
      );
      const result = await response.json();

      if (response.status === 409) {
        setErrorMessage("Telegram ID not registered");
      } else if (response.status === 200 && result.customToken) {
        await signInWithCustomToken(auth, result.customToken);
        setIsLoading(false);
        history.push("/dashboard");
      } else {
        setErrorMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setErrorMessage(`Failed to log in with Telegram: ${error.message}`);
    }
  };

  const resetPassword = () => {
    let email = window.prompt(
      "Password reset link will be sent to your email\nEnter email:"
    );
    if (email) {
      sendPasswordResetEmail(auth, email)
        .then(() => {
          alert(`Password reset email sent to ${email}`);
        })
        .catch((error) => {
          console.error(`Error ${error.code}: ${error.message}`);
        });
    } else {
      alert("Email is not valid!");
    }
  };

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        history.push("/dashboard");
      }
    });

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?19";
    script.async = true;
    script.setAttribute(
      "data-telegram-login",
      import.meta.env.VITE_TELEGRAM_BOT_USERNAME
    );
    script.setAttribute("data-size", "large");
    script.setAttribute("data-auth-url", "/.netlify/functions/telegramLogin");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "TelegramLoginWidgetDataOnauth(user)");
    script.setAttribute("data-userpic", "false");
    document.getElementById("telegram-login").appendChild(script);

    window.TelegramLoginWidgetDataOnauth = async (user) => {
      setIsLoading(true);
      handleTelegramLogin(user);
    };

    return () => {
      const node = document.getElementById("telegram-login");
      if (node && node.contains(script)) {
          node.removeChild(script);
      }
  };
}, []);

  return (
    <div className="border max-w-lg mx-auto rounded-md p-10 mt-20">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          login();
        }}
      >
        <h2 className="text-center text-2xl mb-5">Login</h2>
        <label htmlFor="email" className="text-sm">
          Email
        </label>
        <input
          type="text"
          name="email"
          className="border input-bordered py-2 px-3 rounded-md w-full block mt-1 mb-5"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          required
        />
        <label htmlFor="password" className="text-sm">
          Password
        </label>
        <input
          type="password"
          name="password"
          className="border input-bordered py-2 px-3 rounded-md w-full block mt-1 mb-5"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          required
        />
        {errorMessage && (
          <div className="bg-red-100 text-red-700 px-4 py-3 text-sm rounded-md mb-5">
            {errorMessage}
          </div>
        )}
        <button
          disabled={isLoading}
          className="bg-blue-700 px-3 py-3 rounded-md text-sm text-white me-2 w-full disabled:bg-gray-300 mb-5"
        >
          {isLoading ? "Loading..." : "Submit"}
        </button>
        <a className="underline text-sm cursor-pointer" onClick={resetPassword}>
          Forget password
        </a>
      </form>
      <div
        id="telegram-login"
        className="mt-5 text-center flex flex-col items-center"
      >
        <h3 className="text-sm mb-2">Or log in with Telegram</h3>
      </div>
    </div>
  );
}
