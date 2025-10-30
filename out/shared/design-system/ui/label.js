import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "../utils";
const Label = React.forwardRef(({ className, ...props }, ref) => (_jsx(LabelPrimitive.Root, { ref: ref, className: cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className), ...props })));
Label.displayName = LabelPrimitive.Root.displayName;
export { Label };
