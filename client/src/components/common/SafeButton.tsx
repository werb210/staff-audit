import * as React from "react";
import { stopAll } from "@/lib/dom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  onSafeClick?: () => void;
};

export default function SafeButton({ onSafeClick, className = "", ...rest }: Props) {
  return (
    <button
      {...rest}
      onClick={(e) => { 
        stopAll(e); 
        onSafeClick?.(); 
      }}
      className={`px-3 py-2 rounded border hover:bg-gray-50 ${className}`}
    />
  );
}