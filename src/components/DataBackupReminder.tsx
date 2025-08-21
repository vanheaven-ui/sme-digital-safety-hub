"use client";

import { useState, useEffect } from "react";

export default function DataBackupReminder() {
  const [showNotification, setShowNotification] = useState<boolean>(false);

  const [lastReminderDate, setLastReminderDate] = useState<Date | null>(null);

  useEffect(() => {
    const storedDate = localStorage.getItem("lastBackupReminderDate");
    if (storedDate) {
      const lastDate = new Date(storedDate);
      const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
      const now = new Date();

      if (now.getTime() - lastDate.getTime() > oneWeekInMs) {
        setShowNotification(true);
      }
      setLastReminderDate(lastDate);
    } else {
      setShowNotification(true);
    }
  }, []);

  const handleSetReminder = () => {
    const now = new Date();
    localStorage.setItem("lastBackupReminderDate", now.toISOString());
    setLastReminderDate(now);
    setShowNotification(false);
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
        Data Backup Reminder
      </h2>
      {showNotification ? (
        <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md flex items-center justify-between transition-opacity duration-300">
          <p className="font-semibold">It's time to back up your data! 💾</p>
          <button
            onClick={handleSetReminder}
            className="bg-yellow-600 text-white text-sm font-semibold py-2 px-4 rounded-full hover:bg-yellow-700 transition-colors"
          >
            I've Backed Up
          </button>
        </div>
      ) : (
        <div className="p-4 bg-gray-200 border border-gray-300 text-gray-600 rounded-md">
          <p className="text-center">
            You're all set! Reminder for next backup will appear in a week.
          </p>
        </div>
      )}
    </div>
  );
}
