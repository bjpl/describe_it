"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  ConfirmModal,
  Tooltip,
  Popover,
  Dropdown,
  DataTable,
  FormField,
  FormLabel,
  FormInput,
  FormMessage,
  useFormValidation,
  ToastProvider,
  useToast,
  EnhancedSkeleton,
  TextSkeleton,
  ProfileSkeleton,
} from "./index";
import { LoadingOverlay } from "./LoadingStates";
import { Search, Settings, Heart, Download, Plus, Trash2 } from "lucide-react";

// Example data for data table
const sampleData = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "Active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User", status: "Inactive" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "Editor", status: "Active" },
  { id: 4, name: "Alice Brown", email: "alice@example.com", role: "User", status: "Pending" },
];

const tableColumns = [
  { key: "name", header: "Name", sortable: true, filterable: true },
  { key: "email", header: "Email", sortable: true, filterable: true },
  { key: "role", header: "Role", sortable: true },
  { 
    key: "status", 
    header: "Status", 
    sortable: true,
    cell: (value: string) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value === "Active" ? "bg-green-100 text-green-800" :
        value === "Inactive" ? "bg-red-100 text-red-800" :
        "bg-yellow-100 text-yellow-800"
      }`}>
        {value}
      </span>
    )
  },
];

const dropdownOptions = [
  { value: "option1", label: "Option 1", description: "First option" },
  { value: "option2", label: "Option 2", description: "Second option" },
  { value: "option3", label: "Option 3", description: "Third option" },
  { value: "option4", label: "Option 4", description: "Fourth option", disabled: true },
];

export function ComponentShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState("");
  const [selectedRows, setSelectedRows] = useState<typeof sampleData>([]);
  const [loading, setLoading] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);

  const { toast: toastFn } = useToast();
  const toast = {
    success: (message: string, options?: { title?: string }) => toastFn({ type: "success", description: message, ...options }),
    error: (message: string, options?: { title?: string; action?: { label: string; onClick: () => void } }) => toastFn({ type: "error", description: message, duration: 0, ...options }),
    warning: (message: string, options?: { title?: string }) => toastFn({ type: "warning", description: message, ...options }),
    info: (message: string) => toastFn({ type: "info", description: message }),
    promise: <T,>(promise: Promise<T>, msgs: { loading: string; success: string; error: string }) => {
      const id = toastFn({ type: "info", description: msgs.loading, duration: 0, dismissible: false });
      promise.then(() => {
        toastFn({ type: "success", description: msgs.success });
      }).catch(() => {
        toastFn({ type: "error", description: msgs.error, duration: 0 });
      });
      return promise;
    }
  };

  // Form validation example
  const {
    values,
    errors,
    getFieldProps,
    isValid,
    validate
  } = useFormValidation({
    initialValues: { name: "", email: "", message: "" },
    rules: {
      name: { 
        required: "Name is required",
        minLength: { value: 2, message: "Name must be at least 2 characters" }
      },
      email: { 
        required: "Email is required",
        pattern: { 
          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
          message: "Please enter a valid email" 
        }
      },
      message: { 
        required: "Message is required",
        minLength: { value: 10, message: "Message must be at least 10 characters" }
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validate();
    
    if (Object.keys(formErrors).length === 0) {
      toast.success("Form submitted successfully!");
    } else {
      toast.error("Please fix the form errors");
    }
  };

  const showToasts = () => {
    toast.success("Success message!", { title: "Well done!" });
    
    setTimeout(() => {
      toast.warning("Warning message", { title: "Be careful" });
    }, 1000);
    
    setTimeout(() => {
      toast.error("Error message", { 
        title: "Something went wrong",
        action: { label: "Retry", onClick: () => toast.info("Retrying...") }
      });
    }, 2000);
    
    setTimeout(() => {
      toast.info("Info message with long content that wraps to multiple lines to show how the toast handles longer content gracefully");
    }, 3000);
  };

  const simulateLoading = async () => {
    setLoading(true);
    
    const promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.5 ? resolve("Success!") : reject(new Error("Failed!"));
      }, 3000);
    });

    toast.promise(promise, {
      loading: "Processing your request...",
      success: "Operation completed successfully!",
      error: "Operation failed. Please try again."
    });

    try {
      await promise;
    } catch (error) {
      // Error handled by toast.promise
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">UI Component Showcase</h1>
        <p className="text-lg text-muted-foreground">
          Comprehensive collection of accessible, interactive UI components
        </p>
      </div>

      {/* Buttons Section */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>
            Various button styles with loading states and accessibility features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button variant="default">Default Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon"><Settings className="h-4 w-4" /></Button>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Button loading={loading} onClick={simulateLoading}>
              {loading ? "Processing..." : "Simulate Loading"}
            </Button>
            <Button leftIcon={<Plus className="h-4 w-4" />}>
              With Left Icon
            </Button>
            <Button rightIcon={<Download className="h-4 w-4" />}>
              With Right Icon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals Section */}
      <Card>
        <CardHeader>
          <CardTitle>Modals & Dialogs</CardTitle>
          <CardDescription>
            Accessible modal dialogs with focus management and keyboard navigation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => setModalOpen(true)}>
              Open Modal
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => setConfirmModalOpen(true)}
            >
              Delete Item
            </Button>
          </div>
          
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Example Modal"
            description="This is a demonstration of the modal component with accessibility features."
            size="md"
          >
            <div className="space-y-4">
              <p>
                This modal demonstrates proper focus management, escape key handling,
                and click-outside-to-close functionality.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalOpen(false)}>
                  Confirm
                </Button>
              </div>
            </div>
          </Modal>
          
          <ConfirmModal
            isOpen={confirmModalOpen}
            onClose={() => setConfirmModalOpen(false)}
            onConfirm={() => {
              toast.success("Item deleted successfully");
              setConfirmModalOpen(false);
            }}
            title="Delete Item"
            description="Are you sure you want to delete this item? This action cannot be undone."
            variant="destructive"
            confirmText="Delete"
          />
        </CardContent>
      </Card>

      {/* Tooltips & Popovers */}
      <Card>
        <CardHeader>
          <CardTitle>Tooltips & Popovers</CardTitle>
          <CardDescription>
            Contextual information with smart positioning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Tooltip content="This is a helpful tooltip" position="top">
              <Button variant="outline">Hover for Tooltip (Top)</Button>
            </Tooltip>
            
            <Tooltip content="Bottom positioned tooltip" position="bottom">
              <Button variant="outline">Hover for Tooltip (Bottom)</Button>
            </Tooltip>
            
            <Tooltip 
              content="This tooltip has a longer message to demonstrate how tooltips handle wrapping text content gracefully" 
              position="right"
            >
              <Button variant="outline">Long Tooltip</Button>
            </Tooltip>
          </div>
          
          <div className="flex gap-4">
            <Popover
              content={
                <div className="p-4 space-y-2">
                  <h4 className="font-semibold">Popover Content</h4>
                  <p className="text-sm">This is a more complex popover with formatted content.</p>
                  <Button size="sm" variant="outline">Action Button</Button>
                </div>
              }
              trigger="click"
            >
              <Button variant="outline">Click for Popover</Button>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Dropdowns */}
      <Card>
        <CardHeader>
          <CardTitle>Dropdown Menus</CardTitle>
          <CardDescription>
            Searchable dropdowns with keyboard navigation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <FormField>
              <FormLabel>Basic Dropdown</FormLabel>
              <Dropdown
                items={dropdownOptions}
                value={selectedValue}
                onSelect={setSelectedValue}
                placeholder="Select an option..."
              />
            </FormField>
            
            <FormField>
              <FormLabel>Searchable Dropdown</FormLabel>
              <Dropdown
                items={dropdownOptions}
                value={selectedValue}
                onSelect={setSelectedValue}
                searchable
                placeholder="Search options..."
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
          <CardDescription>
            Feature-rich data table with sorting, filtering, and selection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={sampleData}
            columns={tableColumns}
            selectable
            onSelectionChange={setSelectedRows}
            searchable
            searchPlaceholder="Search users..."
            filterable
          />
          {selectedRows.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium">
                {selectedRows.length} row(s) selected
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forms */}
      <Card>
        <CardHeader>
          <CardTitle>Form Components</CardTitle>
          <CardDescription>
            Form fields with validation and accessibility features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <FormField>
              <FormLabel required>Name</FormLabel>
              <FormInput 
                {...getFieldProps("name")}
                placeholder="Enter your name"
              />
              {errors.name && <FormMessage>{errors.name}</FormMessage>}
            </FormField>
            
            <FormField>
              <FormLabel required>Email</FormLabel>
              <FormInput 
                {...getFieldProps("email")}
                type="email"
                placeholder="Enter your email"
              />
              {errors.email && <FormMessage>{errors.email}</FormMessage>}
            </FormField>
            
            <FormField>
              <FormLabel required>Message</FormLabel>
              <textarea 
                {...getFieldProps("message")}
                placeholder="Enter your message"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.message && <FormMessage>{errors.message}</FormMessage>}
            </FormField>
            
            <Button type="submit" disabled={!isValid} className="w-full">
              Submit Form
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States</CardTitle>
          <CardDescription>
            Various loading indicators and skeleton screens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => setShowSkeletons(!showSkeletons)}>
              Toggle Skeletons
            </Button>
            <Button onClick={showToasts}>
              Show All Toast Types
            </Button>
          </div>
          
          <LoadingOverlay isLoading={showSkeletons}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Profile Skeleton</h4>
                <ProfileSkeleton />
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Text Skeleton</h4>
                <TextSkeleton lines={4} />
              </div>
            </div>
          </LoadingOverlay>
        </CardContent>
      </Card>

      {/* Accessibility Features */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Features</CardTitle>
          <CardDescription>
            All components include proper ARIA labels, keyboard navigation, and focus management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Keyboard Navigation</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Tab/Shift+Tab to navigate between interactive elements</li>
                <li>• Space/Enter to activate buttons and dropdowns</li>
                <li>• Escape to close modals, dropdowns, and popovers</li>
                <li>• Arrow keys to navigate within dropdowns and tables</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Screen Reader Support</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Proper ARIA labels and roles</li>
                <li>• Live regions for dynamic content updates</li>
                <li>• Descriptive error messages</li>
                <li>• Semantic HTML structure</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Wrapper component with toast provider
export function ComponentShowcaseWithProvider() {
  return (
    <ToastProvider>
      <ComponentShowcase />
    </ToastProvider>
  );
}

export default ComponentShowcaseWithProvider;