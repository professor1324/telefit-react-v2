import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { auth } from '../config/firebase';

const SettingsPage = () => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [telegramId, setTelegramId] = useState('');
    const [isTelegramLinked, setIsTelegramLinked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Fetch user data to check if Telegram ID is linked
        const fetchUserData = async () => {
            const user = auth.currentUser;
            if (user) {
                try {
                    const token = await user.getIdToken();
                    const response = await axios.get('/.netlify/functions/settings', {
                        params: { userId: user.uid, action: 'getTelegramId' },
                        headers: {
                            Authorization: `Bearer ${token}`, // Include ID token in the request
                        },
                    });
                    if (response.data.telegramId) {
                        setTelegramId(response.data.telegramId);
                        setIsTelegramLinked(true);
                    } else {
                        setIsTelegramLinked(false);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        if (!isTelegramLinked) {
            // Create and append the Telegram widget script dynamically
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

            // Define the callback function for when the user authenticates via Telegram
            window.TelegramLoginWidgetDataOnauth = async (user) => {
                setIsLoading(true);
                handleTelegramLogin(user);
            };

            return () => {
                // Cleanup the script when the component unmounts or isTelegramLinked changes
                const node = document.getElementById("telegram-login");
                if (node && node.contains(script)) {
                    node.removeChild(script);
                }
            };
        }
    }, [isTelegramLinked]);

    const handleChangePassword = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const token = await user.getIdToken();
                await axios.post('/.netlify/functions/settings', {
                    action: 'changePassword',
                    userId: user.uid,
                    newPassword,
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`, // Include ID token in the request
                    },
                });
                alert('Password updated successfully');
            }
        } catch (error) {
            alert('Failed to update password: ' + error.response.data.error);
        }
    };

    const handleUnlinkTelegram = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const token = await user.getIdToken();
                await axios.post('/.netlify/functions/settings', {
                    action: 'unlinkTelegram',
                    userId: user.uid,
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`, // Include ID token in the request
                    },
                });
                setIsTelegramLinked(false);
                setTelegramId('');
                alert('Telegram account unlinked successfully');
            }
        } catch (error) {
            alert('Failed to unlink Telegram account: ' + error.response.data.error);
        }
    };

    const handleTelegramLogin = async (telegramData) => {
        try {
            const user = auth.currentUser;
            if (user) {
                const token = await user.getIdToken();
                await axios.post('/.netlify/functions/settings', {
                    action: 'linkTelegram',
                    userId: user.uid,
                    telegramData, // Pass the full Telegram data object
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`, // Include ID token in the request
                    },
                });
                setTelegramId(telegramData.id);
                setIsTelegramLinked(true);
                setIsLoading(false);
                alert('Telegram account linked successfully');
            }
        } catch (error) {
            setIsLoading(false);
            alert('Failed to link Telegram account: ' + error.response.data.error);
        }
    };

    return (
        <div className="max-w-lg mx-auto p-6 shadow-md rounded-lg">
            <h1 className="text-2xl font-bold text-blue-700 mb-4">Settings</h1>

            {/* Change Password Section */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Change Password</h2>
                <input
                    type="password"
                    placeholder="Old Password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={handleChangePassword}
                    className="w-full bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                    Change Password
                </button>
            </div>

            {/* Manage Telegram Account Section */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Manage Telegram Account</h2>
                {isTelegramLinked ? (
                    <button
                        onClick={handleUnlinkTelegram}
                        className="w-full bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-400"
                    >
                        Unlink Telegram Account
                    </button>
                ) : (
                    <div id="telegram-login"></div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
