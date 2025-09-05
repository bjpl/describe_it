"use client";

import { memo } from "react";
import { NotificationSettingsProps } from "./types";

export const NotificationSettings = memo<NotificationSettingsProps>(function NotificationSettings({
  settings,
  onSettingChange,
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Study Preferences</h3>

      {/* Daily Goal */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-medium mb-3">Daily Goal</h4>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="1"
            max="50"
            value={settings.study.dailyGoal}
            onChange={(e) =>
              onSettingChange("study", {
                dailyGoal: parseInt(e.target.value),
              })
            }
            className="flex-1"
          />
          <span className="w-16 text-center">
            {settings.study.dailyGoal} images
          </span>
        </div>
      </div>

      {/* Difficulty */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-medium mb-3">Difficulty Level</h4>
        <select
          value={settings.study.difficulty}
          onChange={(e) =>
            onSettingChange("study", {
              difficulty: e.target.value as any,
            })
          }
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Reminders */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">Study Reminders</h4>
          <input
            type="checkbox"
            checked={settings.study.enableReminders}
            onChange={(e) =>
              onSettingChange("study", {
                enableReminders: e.target.checked,
              })
            }
            className="rounded"
          />
        </div>

        {settings.study.enableReminders && (
          <div className="space-y-2">
            {settings.study.reminderTimes.map((time, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => {
                    const newTimes = [...settings.study.reminderTimes];
                    newTimes[index] = e.target.value;
                    onSettingChange("study", {
                      reminderTimes: newTimes,
                    });
                  }}
                  className="px-2 py-1 border rounded dark:bg-gray-600 dark:border-gray-500"
                />
                <button
                  onClick={() => {
                    const newTimes = settings.study.reminderTimes.filter(
                      (_, i) => i !== index,
                    );
                    onSettingChange("study", {
                      reminderTimes: newTimes,
                    });
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}

            {settings.study.reminderTimes.length < 5 && (
              <button
                onClick={() => {
                  const newTimes = [...settings.study.reminderTimes, "12:00"];
                  onSettingChange("study", {
                    reminderTimes: newTimes,
                  });
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Add Reminder
              </button>
            )}
          </div>
        )}
      </div>

      {/* Auto Advance */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Auto Advance</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatically move to next image after completing tasks
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.study.autoAdvance}
            onChange={(e) =>
              onSettingChange("study", {
                autoAdvance: e.target.checked,
              })
            }
            className="rounded"
          />
        </div>
      </div>

      {/* Accessibility Features */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
        <h4 className="font-medium">Accessibility Features</h4>
        
        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-medium">Screen Reader Support</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Optimize for screen readers
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.accessibility.screenReader}
            onChange={(e) =>
              onSettingChange("accessibility", {
                screenReader: e.target.checked,
              })
            }
            className="rounded"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-medium">Keyboard Navigation</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enhanced keyboard support
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.accessibility.keyboardNavigation}
            onChange={(e) =>
              onSettingChange("accessibility", {
                keyboardNavigation: e.target.checked,
              })
            }
            className="rounded"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-medium">Focus Indicators</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Show focus outlines
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.accessibility.focusIndicator}
            onChange={(e) =>
              onSettingChange("accessibility", {
                focusIndicator: e.target.checked,
              })
            }
            className="rounded"
          />
        </div>
      </div>
    </div>
  );
});

NotificationSettings.displayName = "NotificationSettings";