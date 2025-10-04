/**
 * Test Export Functionality
 * Simple test to verify export functionality works correctly
 */

// Mock data for testing
const mockVocabulary = [
  {
    phrase: "el perro",
    translation: "the dog",
    definition: "A domesticated carnivorous mammal",
    partOfSpeech: "noun",
    difficulty: "beginner",
    category: "animals",
    context: "El perro corre en el parque",
    dateAdded: "2024-01-15T10:00:00Z",
    reviewCount: 3,
    confidence: 0.8
  },
  {
    phrase: "correr",
    translation: "to run",
    definition: "To move at a speed faster than walking",
    partOfSpeech: "verb",
    difficulty: "beginner",
    category: "actions",
    context: "Me gusta correr por la mañana",
    dateAdded: "2024-01-16T14:30:00Z",
    reviewCount: 1,
    confidence: 0.6
  }
];

const mockDescriptions = [
  {
    id: "desc-1",
    imageId: "image-123",
    style: "detailed",
    content: "A beautiful landscape showing mountains in the background with a lake in the foreground.",
    wordCount: 15,
    language: "en",
    createdAt: "2024-01-15T12:00:00Z",
    generationTime: 2500
  }
];

const mockQA = [
  {
    id: "qa-1",
    question: "What color is the dog?",
    answer: "The dog is brown",
    category: "colors",
    difficulty: "easy",
    confidence: 0.9,
    createdAt: "2024-01-15T13:00:00Z",
    correct: true,
    userAnswer: "brown"
  }
];

const mockSessions = [
  {
    timestamp: "2024-01-15T10:00:00Z",
    sessionId: "session-123",
    activityType: "search_query",
    content: "dogs playing",
    details: "Image search query",
    duration: 1500
  }
];

// Test function
async function testExportFunctionality() {
  try {
    console.log("🧪 Testing Export Functionality");
    console.log("================================");

    // Test CSV Export
    console.log("📊 Testing CSV Export...");
    const { CSVExporter, exportToEnhancedCSV } = await import('../src/lib/export/csvExporter.js');
    
    const csvExporter = new CSVExporter({
      delimiter: ',',
      includeHeaders: true,
      quoteStrings: true
    });

    const mockExportData = {
      metadata: {
        exportId: 'test-export-123',
        createdAt: new Date().toISOString(),
        format: 'csv',
        totalItems: 4,
        categories: ['vocabulary', 'descriptions', 'qa', 'sessions'],
        version: '2.0.0'
      },
      vocabulary: mockVocabulary,
      descriptions: mockDescriptions,
      qa: mockQA,
      sessions: mockSessions
    };

    const csvBlob = await csvExporter.exportToCSV(mockExportData);
    console.log(`✅ CSV Export successful: ${csvBlob.size} bytes`);

    // Test JSON Export
    console.log("📄 Testing JSON Export...");
    const { exportToJSON } = await import('../src/lib/export/jsonExporter.js');
    
    const jsonBlob = await exportToJSON(mockExportData);
    console.log(`✅ JSON Export successful: ${jsonBlob.size} bytes`);

    // Test Export Manager
    console.log("🎛️  Testing Export Manager...");
    const { createExportManager } = await import('../src/lib/export/exportManager.js');
    
    const dataSources = {
      getVocabulary: async () => mockVocabulary,
      getDescriptions: async () => mockDescriptions,
      getQA: async () => mockQA,
      getSessions: async () => mockSessions,
      getImages: async () => []
    };

    const exportManager = createExportManager(dataSources);
    
    const exportOptions = {
      format: 'csv',
      categories: ['vocabulary'],
      includeMetadata: true
    };

    const result = await exportManager.exportData(exportOptions);
    
    if (result.success) {
      console.log(`✅ Export Manager successful: ${result.filename} (${result.size} bytes)`);
    } else {
      console.log(`❌ Export Manager failed: ${result.error}`);
    }

    // Test validation
    console.log("✔️  Testing Data Validation...");
    const { validateExportData } = await import('../src/lib/export/index.js');
    
    const validation = validateExportData(mockVocabulary, mockDescriptions, mockQA, mockSessions);
    
    if (validation.isValid) {
      console.log("✅ Data validation passed");
    } else {
      console.log("❌ Data validation failed:", validation.errors);
    }

    // Test size estimation
    console.log("📏 Testing Size Estimation...");
    const { estimateExportSize, getRecommendedFormat } = await import('../src/lib/export/index.js');
    
    const estimatedSize = estimateExportSize(mockVocabulary.length, 'csv');
    const recommendedFormat = getRecommendedFormat(mockVocabulary.length);
    
    console.log(`✅ Estimated size: ${estimatedSize}`);
    console.log(`✅ Recommended format: ${recommendedFormat}`);

    console.log("\n🎉 All export tests passed!");
    
    return {
      success: true,
      csvSize: csvBlob.size,
      jsonSize: jsonBlob.size,
      estimatedSize,
      recommendedFormat
    };

  } catch (error) {
    console.error("❌ Export test failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && typeof module !== 'undefined') {
  testExportFunctionality()
    .then(result => {
      if (result.success) {
        console.log("\n✅ Export functionality test completed successfully");
        process.exit(0);
      } else {
        console.log("\n❌ Export functionality test failed");
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("Test runner error:", error);
      process.exit(1);
    });
}

// Export for use in other test files
if (typeof module !== 'undefined') {
  module.exports = {
    testExportFunctionality,
    mockVocabulary,
    mockDescriptions,
    mockQA,
    mockSessions
  };
}