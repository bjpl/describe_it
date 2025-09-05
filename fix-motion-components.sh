#!/bin/bash

# Script to fix all motion component imports and usages

files=(
  "src/app/page.tsx"
  "src/components/Accessibility/AccessibilityProvider.tsx"
  "src/components/DescriptionNotebook.tsx"
  "src/components/DescriptionTabs.tsx"
  "src/components/EnhancedComponentShowcase.tsx"
  "src/components/ErrorBoundary/EnhancedErrorBoundary.tsx"
  "src/components/Export/EnhancedExportManager.tsx"
  "src/components/ImageSearch/ImageGrid.tsx"
  "src/components/ImageSearch/PaginationControls.tsx"
  "src/components/ImageSearch/SearchFilters.tsx"
  "src/components/ImageViewer/ImageViewer.tsx"
  "src/components/ImageViewer/InlineImageViewer.tsx"
  "src/components/LanguageToggles.tsx"
  "src/components/Loading/SkeletonScreens.tsx"
  "src/components/Optimized/OptimizedImage.tsx"
  "src/components/Performance/AdvancedCaching.tsx"
  "src/components/Performance/BundleAnalyzer.tsx"
  "src/components/Performance/PerformanceDashboard.tsx"
  "src/components/Performance/PerformanceMonitor.tsx"
  "src/components/Performance/PWAOptimizations.tsx"
  "src/components/ProgressTracking/EnhancedProgressDashboard.tsx"
  "src/components/QuestionCounter.tsx"
  "src/components/QuestionNavigator.tsx"
  "src/components/Settings/EnhancedSettingsPanel.tsx"
  "src/components/ShowAnswer.tsx"
  "src/components/StyleSelector.tsx"
)

for file in "${files[@]}"; do
  echo "Processing $file..."
  
  # Skip if file doesn't exist
  if [ ! -f "$file" ]; then
    echo "  File not found, skipping..."
    continue
  fi
  
  # Check what motion components are used in the file
  motion_components=$(grep -o "motion\.\w\+" "$file" | sort -u)
  
  # Build import statement based on what's used
  import_components=""
  for component in $motion_components; do
    case $component in
      "motion.div") import_components="$import_components MotionDiv," ;;
      "motion.button") import_components="$import_components MotionButton," ;;
      "motion.span") import_components="$import_components MotionSpan," ;;
      "motion.p") import_components="$import_components MotionP," ;;
      "motion.h1"|"motion.h2"|"motion.h3"|"motion.h4"|"motion.h5"|"motion.h6") 
        import_components="$import_components MotionH1, MotionH2, MotionH3, MotionH4, MotionH5, MotionH6," ;;
      "motion.form") import_components="$import_components MotionForm," ;;
      "motion.input") import_components="$import_components MotionInput," ;;
      "motion.img") import_components="$import_components MotionImg," ;;
      "motion.ul") import_components="$import_components MotionUl," ;;
      "motion.li") import_components="$import_components MotionLi," ;;
      "motion.header") import_components="$import_components MotionHeader," ;;
      "motion.section") import_components="$import_components MotionSection," ;;
      "motion.nav") import_components="$import_components MotionNav," ;;
      "motion.main") import_components="$import_components MotionMain," ;;
      "motion.aside") import_components="$import_components MotionAside," ;;
      "motion.footer") import_components="$import_components MotionFooter," ;;
      "motion.a") import_components="$import_components MotionA," ;;
    esac
  done
  
  if [ -n "$import_components" ]; then
    # Remove duplicates and trailing comma
    import_components=$(echo "$import_components" | tr ',' '\n' | sort -u | tr '\n' ',' | sed 's/,$/ /')
    
    # Update imports
    sed -i 's/import { motion, AnimatePresence } from "framer-motion";/import { AnimatePresence } from "framer-motion";\nimport { '"$import_components"'} from "@\/components\/ui\/MotionWrappers";/' "$file"
    
    # Replace motion components
    sed -i 's/motion\.div/MotionDiv/g' "$file"
    sed -i 's/motion\.button/MotionButton/g' "$file"
    sed -i 's/motion\.span/MotionSpan/g' "$file"
    sed -i 's/motion\.p/MotionP/g' "$file"
    sed -i 's/motion\.h1/MotionH1/g' "$file"
    sed -i 's/motion\.h2/MotionH2/g' "$file"
    sed -i 's/motion\.h3/MotionH3/g' "$file"
    sed -i 's/motion\.h4/MotionH4/g' "$file"
    sed -i 's/motion\.h5/MotionH5/g' "$file"
    sed -i 's/motion\.h6/MotionH6/g' "$file"
    sed -i 's/motion\.form/MotionForm/g' "$file"
    sed -i 's/motion\.input/MotionInput/g' "$file"
    sed -i 's/motion\.img/MotionImg/g' "$file"
    sed -i 's/motion\.ul/MotionUl/g' "$file"
    sed -i 's/motion\.li/MotionLi/g' "$file"
    sed -i 's/motion\.header/MotionHeader/g' "$file"
    sed -i 's/motion\.section/MotionSection/g' "$file"
    sed -i 's/motion\.nav/MotionNav/g' "$file"
    sed -i 's/motion\.main/MotionMain/g' "$file"
    sed -i 's/motion\.aside/MotionAside/g' "$file"
    sed -i 's/motion\.footer/MotionFooter/g' "$file"
    sed -i 's/motion\.a/MotionA/g' "$file"
    
    echo "  Updated $file with motion component fixes"
  else
    echo "  No motion components found in $file"
  fi
done

echo "All files processed!"