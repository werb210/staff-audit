import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import AddLenderModal from '@/pages/staff/lenders/AddLenderModal';

interface CreateLenderButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export default function CreateLenderButton({ 
  variant = 'default',
  size = 'default',
  className = '',
  showIcon = true,
  children
}: CreateLenderButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        onClick={() => setIsModalOpen(true)}
      >
        {showIcon && <Plus className="h-4 w-4" />}
        {children || 'Create Lender'}
      </Button>

      <AddLenderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}