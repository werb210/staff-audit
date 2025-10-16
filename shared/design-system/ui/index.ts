// Unified UI Component Library
// Single source of truth for all user interface components

export { Button } from './button';
export type { ButtonProps } from './button';

export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from './card';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';

export { Badge, badgeVariants } from './badge';
export type { BadgeProps } from './badge';

export { Input } from './input';
export type { InputProps } from './input';

export { Label } from './label';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select';

// MIGRATION NOTE: All applications should import UI components from this index
// This prevents duplicate component issues and ensures design system consistency