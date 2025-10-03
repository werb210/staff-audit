# Boreal Design System - Migration Guide

## Overview

This is the unified design system for the Boreal Financial Platform implementing the best practices for UI migration between Replit applications. This design system prevents duplicate components and ensures consistent branding across all applications.

## Migration Strategy (Following Best Practices)

### 1. 🔍 Style System Inventory

**Current Applications:**
- **Staff Portal** (`apps/staff-portal`) - SOURCE OF TRUTH (most comprehensive design)
- **Client App** (`client`) - TO BE MIGRATED

**Layout Components Identified:**
- MainLayout, Sidebar, Header (Staff Portal - Advanced)
- App.tsx, basic components (Client App - Simple)

**Theme Configuration:**
- tailwind.config.ts (Staff Portal - Production-ready branding)
- index.css (Staff Portal - Professional color system)

### 2. ✅ Design Authority Established

**Staff Portal** = **Source of Truth** for all design decisions because:
- Advanced branding system with professional color palette
- Comprehensive component library with shadcn/ui
- Production-ready layout with HubSpot-style CRM design
- Complete authentication flows and protected routes
- Advanced dashboard with pipeline management

### 3. 🧹 Clean App Shell Replacement Strategy

```typescript
// BEFORE: Multiple layout systems
// Staff Portal: MainLayout with advanced sidebar
// Client App: Basic App.tsx with simple navigation

// AFTER: Single unified layout system
// All apps: shared/design-system/layout/MainLayout
```

### 4. 🧪 Route Mapping Analysis

**Current Route Conflicts:**
- `/dashboard` exists in both apps with different layouts
- `/login` uses different authentication components
- Multiple `ApplicationCard` components with different styling

**Migration Target:**
- Single `/dashboard` route with role-based content
- Unified login with shared authentication
- Single `ApplicationCard` with consistent branding

## Component Migration Status

### ✅ Layout Components (Staff Portal → Shared)
- **MainLayout**: Advanced layout with role-based sidebar ✅
- **Sidebar**: Navigation with professional branding ✅  
- **Header**: Top bar with user controls and notifications ✅

### ✅ UI Components (shadcn/ui based)
- **Button**: Professional button system with variants ✅
- **Card**: Consistent card styling with shadows and borders ✅
- **Dialog**: Modal system with backdrop and animations ✅
- **Badge**: Status indicators with semantic colors ✅
- **Tabs**: Professional tab navigation ✅

### 🔄 Business Components (In Progress)
- **ApplicationCard**: Standardizing between apps
- **PipelineBoard**: Migration from staff portal
- **Dashboard**: Role-based dashboard consolidation

## Migration Implementation

### Step 1: Create Shared Design System
```bash
mkdir -p shared/design-system/{layout,ui,business,theme}
```

### Step 2: Extract Staff Portal Components
```typescript
// Copy from apps/staff-portal/src/components/
// To: shared/design-system/layout/
// Files: MainLayout.tsx, Sidebar.tsx, Header.tsx
```

### Step 3: Update Import Paths
```typescript
// ❌ OLD (Client App)
import { Header } from '../components/Header';

// ✅ NEW (Shared Design System)  
import { Header } from '../../shared/design-system/layout/Header';
```

### Step 4: Add Deprecation Warnings
```typescript
// In legacy components:
// DEPRECATED - DO NOT USE IN V2. Use shared/design-system/layout/MainLayout.tsx instead.
console.warn('Legacy component used - migrate to shared design system');
```

## ESLint Rules for Legacy Prevention

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["../pages/Dashboard.tsx", "./Dashboard.tsx"],
            "message": "Use shared/design-system/business/Dashboard instead"
          },
          {
            "group": ["../components/Header.tsx"],
            "message": "Use shared/design-system/layout/Header instead"
          }
        ]
      }
    ]
  }
}
```

## Professional Branding System

### Color Palette (From Staff Portal)
```css
:root {
  /* Primary Brand Colors */
  --primary: 210 40% 20%;     /* Professional navy */
  --primary-foreground: 210 40% 98%;
  
  /* Status Colors */
  --success: 142 76% 36%;     /* Success green */
  --warning: 38 92% 50%;      /* Warning amber */
  --destructive: 0 84% 60%;   /* Error red */
  
  /* Pipeline Stage Colors */
  --stage-new: 210 100% 50%;
  --stage-review: 39 100% 50%;
  --stage-approved: 142 76% 36%;
  --stage-funded: 142 100% 25%;
}
```

### Typography Hierarchy
```css
.text-display-large { font-size: 2.5rem; font-weight: 700; }
.text-heading-1 { font-size: 2rem; font-weight: 600; }
.text-heading-2 { font-size: 1.5rem; font-weight: 600; }
.text-body-large { font-size: 1.125rem; font-weight: 400; }
.text-body { font-size: 1rem; font-weight: 400; }
.text-body-small { font-size: 0.875rem; font-weight: 400; }
```

## Migration Checklist

### For Each Application:
- [ ] Replace App.tsx with shared MainLayout
- [ ] Update all imports to use shared design system  
- [ ] Remove duplicate components (Header, Sidebar, etc.)
- [ ] Test all routes with new layout
- [ ] Add deprecation warnings to legacy components
- [ ] Update package.json with shared design system paths
- [ ] Verify authentication flows work with shared components
- [ ] Test responsive design across all breakpoints

### Quality Assurance:
- [ ] No duplicate layout components exist
- [ ] All apps use identical branding and colors
- [ ] Navigation behavior is consistent
- [ ] Role-based access control works correctly
- [ ] Performance is not degraded
- [ ] No TypeScript errors or warnings

## Development Workflow

### Adding New Components:
1. **Create in Staff Portal first** (our design authority)
2. **Test thoroughly** with real data and user flows
3. **Extract to shared design system** when stable
4. **Update all consuming applications** 
5. **Add deprecation warnings** to old components
6. **Remove legacy components** after migration complete

### Breaking Changes:
1. **Create migration guide** with before/after examples
2. **Add deprecation warnings** with timeline
3. **Provide automatic migration scripts** when possible
4. **Update all applications simultaneously**
5. **Remove deprecated code** only after full migration

## Support and Maintenance

### Documentation:
- Component API documentation with TypeScript types
- Usage examples with real-world scenarios  
- Migration guides for breaking changes
- Performance optimization guidelines

### Monitoring:
- ESLint rules prevent legacy component usage
- Automated tests verify component consistency
- Performance monitoring across applications
- User experience testing with real workflows

## Success Metrics

**Before Migration:**
- 2 separate design systems
- Duplicate components across apps
- Inconsistent branding and user experience
- Maintenance overhead for multiple UI systems

**After Migration:**
- 1 unified design system
- Zero duplicate components
- Consistent professional branding
- Single source of truth for all UI components
- Reduced maintenance overhead
- Faster feature development

## Next Steps

1. **Phase 1**: Complete layout component migration ✅
2. **Phase 2**: Standardize business components (ApplicationCard, Dashboard)
3. **Phase 3**: Implement ESLint rules and automated warnings
4. **Phase 4**: Create component documentation site
5. **Phase 5**: Add automated migration scripts for future changes

This migration follows industry best practices for design system consolidation and ensures our financial platform maintains professional, consistent branding across all user touchpoints.