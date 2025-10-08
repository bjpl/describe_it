// Core UI Components
export { Button } from "./Button";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./Card";
export { Input } from "./Input";
export { Progress } from "./Progress";
export { Badge } from "./Badge";
export { RadioGroup } from "./RadioGroup";
export { Select } from "./Select";
export { Tabs } from "./Tabs";

// Enhanced Components
export {
  Skeleton,
  EnhancedSkeleton,
  SkeletonGroup,
  TextSkeleton,
  ProfileSkeleton,
  CardSkeletonEnhanced,
  TableSkeleton,
} from "./Skeleton";

export type { Toast } from "./Toast";
export {
  ToastProvider,
  useToast,
  toast,
} from "./Toast";

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  ConfirmModal,
} from "./Modal";

export {
  Dropdown,
  SimpleDropdown,
} from "./Dropdown";

export {
  Tooltip,
  Popover,
} from "./Tooltip";

export {
  DataTable,
} from "./DataTable";

export {
  Checkbox,
} from "./Checkbox";

export {
  FormField,
  FormLabel,
  FormDescription,
  FormMessage,
  FormInput,
  FormTextarea,
  useFormValidation,
} from "./FormField";

// Motion Components - Export individual components from MotionComponents
export {
  MotionDiv,
  MotionButton,
  MotionSpan,
  MotionP,
  MotionH1,
  MotionH2,
  MotionH3,
  MotionH4,
  MotionH5,
  MotionH6,
  MotionForm,
  MotionInput,
  MotionTextarea,
  MotionSelect,
  MotionHeader,
  MotionSection,
  MotionArticle,
  MotionAside,
  MotionNav,
  MotionMain,
  MotionFooter,
  MotionA,
  MotionImg,
  MotionUl,
  MotionOl,
  MotionLi,
  MotionLink,
} from "./MotionComponents";

// Fallback components (if needed for compatibility)
export {
  MotionDiv as FallbackMotionDiv,
  MotionButton as FallbackMotionButton,
  MotionSpan as FallbackMotionSpan,
  FallbackAnimatePresence,
} from "./MotionFallback";

// Types - Export from their respective source files
export type { ButtonProps } from "./Button";
export type {
  CardProps,
} from "./Card";
export type { ModalProps } from "./Modal";
export type { TooltipProps, PopoverProps } from "./Tooltip";
export type { DropdownProps, DropdownItem } from "./Dropdown";
export type { DataTableProps, Column } from "./DataTable";
export type { CheckboxProps } from "./Checkbox";
export type {
  FormFieldProps,
  FormLabelProps,
  FormMessageProps,
  FormInputProps,
  FormTextareaProps,
  ValidationRule,
  UseFormValidationProps,
} from "./FormField";
