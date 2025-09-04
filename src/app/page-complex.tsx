"use client";

import { useState } from "react";

export default function Home() {
  console.log("Main Home Page Rendering");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [descriptions, setDescriptions] = useState({
    spanish: "",
    english: "",
  });
  const [activeTab, setActiveTab] = useState("search");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      // Use placeholder images to avoid API issues
      const placeholders = [
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop",
      ];

      await new Promise((resolve) => setTimeout(resolve, 800));
      setSelectedImage(
        placeholders[Math.floor(Math.random() * placeholders.length)],
      );
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDescriptions = async () => {
    if (!selectedImage) return;

    try {
      const response = await fetch("/api/descriptions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: selectedImage,
          style: "conversacional",
          language: "both",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDescriptions({
          spanish:
            data.data?.spanish ||
            "Esta es una imagen interesante para el aprendizaje del español.",
          english:
            data.data?.english ||
            "This is an interesting image for Spanish learning.",
        });
      }
    } catch (error) {
      console.error("Description generation failed:", error);
      // Use fallback descriptions
      setDescriptions({
        spanish:
          "Esta es una hermosa imagen que podemos usar para aprender español.",
        english: "This is a beautiful image we can use to learn Spanish.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Describe It</h1>
              <span className="ml-4 text-sm text-gray-500">
                Spanish Learning through Images
              </span>
            </div>
            <button
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Download"
            >
              📥
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Search */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                🔍
                <span className="ml-2">Image Search</span>
              </h2>

              <div className="space-y-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search for images..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "⏳ Searching..." : "🔍 Search"}
                </button>

                {selectedImage && (
                  <div className="mt-4">
                    <img
                      src={selectedImage}
                      alt="Selected"
                      className="w-full rounded-lg"
                    />
                    <button
                      onClick={generateDescriptions}
                      className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Generate Descriptions
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
                <button
                  onClick={() => setActiveTab("search")}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "search"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  🖼️ Images
                </button>
                <button
                  onClick={() => setActiveTab("descriptions")}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "descriptions"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  📖 Descriptions
                </button>
              </div>

              <div className="min-h-[400px]">
                {activeTab === "search" && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Welcome to Describe It!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Search for images and generate AI-powered descriptions in
                      Spanish and English to enhance your language learning
                      experience.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">
                          How it works:
                        </h4>
                        <ol className="text-sm text-blue-800 space-y-1">
                          <li>1. Search for any image</li>
                          <li>2. Select an image you like</li>
                          <li>3. Generate descriptions</li>
                          <li>4. Learn Spanish vocabulary</li>
                        </ol>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-900 mb-2">
                          Features:
                        </h4>
                        <ul className="text-sm text-green-800 space-y-1">
                          <li>• Multi-style descriptions</li>
                          <li>• Interactive Q&A</li>
                          <li>• Vocabulary extraction</li>
                          <li>• Progress tracking</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "descriptions" && (
                  <div className="space-y-6">
                    {descriptions.spanish ? (
                      <>
                        <div>
                          <h3 className="text-lg font-semibold mb-2 text-blue-600">
                            Spanish Description
                          </h3>
                          <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">
                            {descriptions.spanish}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-2 text-green-600">
                            English Translation
                          </h3>
                          <p className="text-gray-700 bg-green-50 p-4 rounded-lg">
                            {descriptions.english}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-6xl mb-4">📖</div>
                        <p>
                          No descriptions yet. Search for an image and generate
                          descriptions to get started!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
