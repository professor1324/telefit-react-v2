import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useHistory } from "react-router-dom";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [telegramId, setTelegramId] = useState(null);
    const [telegramLinked, setTelegramLinked] = useState(false);  // Indicate if Telegram is linked
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const history = useHistory();

    const register = async () => {
        if (email === "" || password === "" || confirmPassword === "") {
            setErrorMessage("All fields are required");
            return;
        }
        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match");
            return;
        }
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save additional user data in Firestore
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                telegramId: telegramId || null,  // Store Telegram ID or null if not provided
                createdAt: new Date()
            });
            history.push("/dashboard");
        } catch (error) {
            setErrorMessage(`Registration failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://telegram.org/js/telegram-widget.js?19";
        script.async = true;
        script.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_USERNAME);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-auth-url', '/.netlify/functions/telegramAuth');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-onauth', 'TelegramLoginWidgetDataOnauth(user)');
        script.setAttribute('data-userpic', 'false');
        document.getElementById('telegram-login').appendChild(script);

        window.TelegramLoginWidgetDataOnauth = async (user) => {
            try {
                const params = new URLSearchParams(user);
                params.delete("hash");
                params.append("hash", user.hash);

                const response = await fetch(
                    `/.netlify/functions/telegramAuth?${params.toString()}`
                );
                const result = await response.json();

                if (response.status === 409) {
                    setErrorMessage("This Telegram account is already linked to another user.");
                } else if (response.status === 200 && result.id) {
                    setTelegramId(result.id);
                    setTelegramLinked(true);
                    console.log("Telegram ID captured and is unique:", result.id);
                } else {
                    setErrorMessage(`Error: ${result.error}`);
                }
            } catch (error) {
                setErrorMessage(`Failed to link Telegram account: ${error.message}`);
            }
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
            <h2 className="text-center text-2xl mb-5">Register</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                register();
            }}>
                <label htmlFor="email" className="text-sm">Email</label>
                <input
                    type="text"
                    name="email"
                    className="border input-bordered py-2 px-3 rounded-md w-full block mt-1 mb-5"
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    required
                />
                <label htmlFor="password" className="text-sm">Password</label>
                <input
                    type="password"
                    name="password"
                    className="border input-bordered py-2 px-3 rounded-md w-full block mt-1 mb-5"
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                    required
                />
                <label htmlFor="confirm_password" className="text-sm">Confirm Password</label>
                <input
                    type="password"
                    name="confirm_password"
                    className="border input-bordered py-2 px-3 rounded-md w-full block mt-1 mb-5"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    value={confirmPassword}
                    required
                />
                {errorMessage && (
                    <div className="bg-red-100 text-red-700 px-4 py-3 text-sm rounded-md mb-5">
                        {errorMessage}
                    </div>
                )}
                
                <button
                    disabled={isLoading}
                    className="bg-blue-700 px-3 py-3 rounded-md text-sm text-white w-full disabled:bg-gray-300"
                >
                    {isLoading ? "Loading..." : "Submit"}
                </button>

                {telegramLinked ? (
                    <h3>Telegram account linked</h3>
                ) : (
                    <div id="telegram-login" className="mt-5 text-center flex flex-col items-center">
                        <h3 className="text-sm mb-2">Or sign up with Telegram</h3>
                        {/* The Telegram login button will be inserted here by the script */}
                    </div>
                )}
                
            </form>
        </div>
    );
}
