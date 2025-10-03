import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LenderForm from '@/components/lenders/LenderForm';
import { api } from '@/lib/queryClient';

interface AddLenderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddLenderModal({ isOpen, onClose }: AddLenderModalProps) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api('/api/lenders', { 
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lenders'] });
      onClose();
    },
    onError: (error: any) => {
      console.error('❌ [ADD LENDER] Creation failed:', error);
      alert('Failed to create lender: ' + error.message);
    },
  });

  const handleSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lender</DialogTitle>
        </DialogHeader>

        <LenderForm
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
          mode="create"
        />
      </DialogContent>
    </Dialog>
  );
}