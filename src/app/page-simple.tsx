"use client";

import { useState } from "react";

export default function HomePage() {
  console.log("Simple Home Page Rendering");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setMessage("Searching...");

    // Simulate search
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setMessage(`Found results for: "${searchQuery}"`);
    setIsLoading(false);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "2rem",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">🎯 Describe It</h1>
          <p className="text-xl text-white/90">
            Spanish Learning through Images
          </p>
        </header>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Welcome to Your Language Learning Journey
            </h2>
            <p className="text-gray-600 text-lg">
              Search for images and generate AI-powered descriptions to enhance
              your Spanish learning.
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for images... (e.g., 'mountain', 'city', 'food')"
                className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSearch}
                disabled={isLoading || !searchQuery.trim()}
                className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "⏳" : "🔍"} Search
              </button>
            </div>
          </div>

          {/* Results Section */}
          {message && (
            <div className="text-center p-6 bg-blue-50 rounded-lg mb-8">
              <p className="text-lg text-blue-800">{message}</p>
            </div>
          )}

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-4xl mb-4">🖼️</div>
              <h3 className="font-semibold text-gray-800 mb-2">Image Search</h3>
              <p className="text-gray-600">
                Find high-quality images from Unsplash
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="font-semibold text-gray-800 mb-2">
                AI Descriptions
              </h3>
              <p className="text-gray-600">
                Generate detailed Spanish descriptions
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="font-semibold text-gray-800 mb-2">
                Learn & Practice
              </h3>
              <p className="text-gray-600">Interactive Q&A and vocabulary</p>
            </div>
          </div>

          {/* Status */}
          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center text-green-800">
              <span className="text-lg font-medium">
                ✅ Application is running successfully!
              </span>
            </div>
            <div className="text-center mt-2 text-green-600">
              CSS styling, JavaScript, and React are all working correctly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
