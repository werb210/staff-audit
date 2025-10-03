# @pipeline/ui

Enterprise-grade loan processing pipeline components for monorepo deployment. This package provides a complete 6-stage sales pipeline with drag-and-drop functionality, built with React, TypeScript, and @dnd-kit.

## Features

- 🎯 **6-Stage Pipeline**: New → Under Review → Required Docs → Lender Review → Approved → Declined
- 🖱️ **Drag & Drop**: Powered by @dnd-kit for smooth application movement between stages
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🔄 **Real-time Updates**: Integrated with React Query for automatic data synchronization
- 🎨 **Customizable**: Easy to theme and extend for different business needs
- 📊 **Application Cards**: Rich card display with loan amounts, business info, and dates

## Installation

```bash
npm install @pipeline/ui
# or
yarn add @pipeline/ui
```

## Required Dependencies

Ensure these peer dependencies are installed in your project:

```bash
npm install react @tanstack/react-query @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Quick Start

### 1. Setup React Query Provider

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app content */}
    </QueryClientProvider>
  );
}
```

### 2. Set API Base URL

Set the `VITE_PIPELINE_API` environment variable to your API endpoint:

```env
VITE_PIPELINE_API=https://api.yourdomain.com/api
```

If not set, defaults to `/api` for same-origin requests.

### 3. Use the Pipeline Components

```tsx
import { PipelineBoard } from '@pipeline/ui';

function LoanPipeline() {
  const handleApplicationClick = (application) => {
    console.log('Application clicked:', application);
    // Handle application selection (open modal, navigate, etc.)
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Loan Applications Pipeline</h1>
      <PipelineBoard 
        onApplicationClick={handleApplicationClick}
        className="w-full"
      />
    </div>
  );
}
```

## API Requirements

Your backend API should provide these endpoints:

### GET `/v1/applications`

Returns an array of applications:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "businessName": "Tech Startup LLC",
      "loanAmount": 100000,
      "status": "active",
      "stage": "Under Review",
      "applicantName": "John Doe",
      "applicantEmail": "john@techstartup.com",
      "businessType": "Technology",
      "createdAt": "2025-01-03T10:00:00Z",
      "updatedAt": "2025-01-03T15:30:00Z"
    }
  ]
}
```

### PATCH `/v1/applications/{id}/stage`

Updates an application's stage:

```json
{
  "stage": "Lender Review"
}
```

### PATCH `/v1/applications/{id}` (Optional)

Updates application data:

```json
{
  "businessName": "Updated Business Name",
  "loanAmount": 150000
}
```

### DELETE `/v1/applications/{id}` (Optional)

Deletes an application.

## Components

### PipelineBoard

Main pipeline component with drag-and-drop functionality.

```tsx
interface PipelineBoardProps {
  onApplicationClick?: (application: Application) => void;
  className?: string;
}
```

### PipelineStage

Individual stage column component.

```tsx
interface PipelineStageProps {
  id: string;
  title: string;
  count: number;
  applications: Application[];
  onApplicationClick?: (application: Application) => void;
}
```

### ApplicationCard

Individual application card component.

```tsx
interface ApplicationCardProps {
  application: Application;
  onClick?: () => void;
}
```

## Hooks

### useApplications()

Fetches all applications from the API.

```tsx
const { data: applications, isLoading, error } = useApplications();
```

### usePipelineStages()

Fetches applications grouped by pipeline stage.

```tsx
const { data: stages, isLoading } = usePipelineStages();
```

### useMoveStage()

Mutation hook for moving applications between stages.

```tsx
const moveStage = useMoveStage();

moveStage.mutate({
  id: applicationId,
  stage: "Approved"
});
```

### useUpdateApplication()

Mutation hook for updating application data.

```tsx
const updateApp = useUpdateApplication();

updateApp.mutate({
  id: applicationId,
  data: { businessName: "New Name" }
});
```

### useDeleteApplication()

Mutation hook for deleting applications.

```tsx
const deleteApp = useDeleteApplication();

deleteApp.mutate(applicationId);
```

## TypeScript Types

```tsx
interface Application {
  id: number;
  businessName: string;
  loanAmount: number;
  status: string;
  stage: "New" | "Under Review" | "Required Docs" | "Lender Review" | "Approved" | "Declined";
  applicantName?: string;
  applicantEmail?: string;
  businessType: string;
  createdAt: string;
  updatedAt: string;
}

interface PipelineStageData {
  id: string;
  title: string;
  count: number;
  applications: Application[];
}
```

## Styling

The package uses Tailwind CSS classes. Ensure Tailwind is configured in your project:

```js
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@pipeline/ui/**/*.{js,ts,jsx,tsx}"
  ],
  // ... rest of config
}
```

## Enterprise Features

- **Configurable API Base**: Set different API endpoints per environment
- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **Error Handling**: Built-in loading states and error boundaries
- **Performance**: Optimized with React Query caching and invalidation
- **Accessibility**: Keyboard navigation and screen reader support
- **Responsive**: Mobile-first design with grid layouts

## License

MIT License - see LICENSE file for details.