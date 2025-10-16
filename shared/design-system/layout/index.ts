// Unified Layout System Exports
// This is the single source of truth for all layout components

export { MainLayout } from './MainLayout';
export { Sidebar } from './Sidebar';
export { Header } from './Header';

// Type exports
export type { default as MainLayoutProps } from './MainLayout';
export type { default as SidebarProps } from './Sidebar';
export type { default as HeaderProps } from './Header';

// MIGRATION NOTE: All applications should import layout components from this index
// This ensures consistency and prevents duplicate component issues