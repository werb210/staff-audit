import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Shield, Smartphone, Mail, User, Building2, Phone, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { 
  formatPhoneNumber, 
  isValidPhoneNumber, 
  getPhoneFormatHint,
  normalizePhoneNumber 
} from '@/lib/phoneUtils';

// Production-ready User Form Schema
const userFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  mobilePhone: z.string().min(8, "Valid mobile phone is required for SMS 2FA").refine(
    (phone) => isValidPhoneNumber(phone),
    "Please use international format (e.g., +1234567890, +447700900123)"
  ),
  role: z.enum(['admin', 'staff', 'lender', 'referrer'], {
    required_error: "Please select a role"
  }),
  department: z.string().optional(),
  is2FAEnabled: z.boolean().default(true),
  isActive: z.boolean().default(true)
});

type UserFormData = z.infer<typeof userFormSchema>;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobilePhone: string;
  role: string;
  department?: string;
  is2FAEnabled: boolean;
  isActive: boolean;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onUserUpdated: () => void;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator', icon: Shield, description: 'Full system access including user management' },
  { value: 'staff', label: 'Staff', icon: User, description: 'Standard user access for daily operations' },
  { value: 'lender', label: 'Lender', icon: Building2, description: 'Lender portal and product management' },
  { value: 'referrer', label: 'Referrer', icon: User, description: 'Partner referral system access' }
];

const DEPARTMENT_OPTIONS = [
  { value: 'management', label: 'Management' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Finance' },
  { value: 'support', label: 'Customer Support' },
  { value: 'technology', label: 'Technology' }
];

export default function EditUserModal({ isOpen, onClose, user, onUserUpdated }: EditUserModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditingExistingUser = !!user;

  // Initialize form with user data or defaults
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      mobilePhone: '',
      role: 'staff',
      department: 'operations',
      is2FAEnabled: true,
      isActive: true
    }
  });

  // Reset form when user changes
  React.useEffect(() => {
    console.log('📝 EditUserModal useEffect triggered with user:', user);
    
    if (user) {
      const formData = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        mobilePhone: user.mobilePhone || '',
        role: (user.role as any) || 'staff',
        department: user.department || 'operations',
        is2FAEnabled: user.is2FAEnabled ?? true,
        isActive: user.isActive ?? true
      };
      
      console.log('✅ Setting form data:', formData);
      form.reset(formData);
      
      // Ensure form values are set after a small delay
      setTimeout(() => {
        console.log('🔄 Double-checking form values are set:', form.getValues());
      }, 100);
    } else {
      console.log('🆕 New user mode - clearing form');
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        mobilePhone: '',
        role: 'staff',
        department: 'operations',
        is2FAEnabled: true,
        isActive: true
      });
    }
  }, [user, form]);

  // Create/Update user mutation
  const userMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (isEditingExistingUser) {
        return await apiRequest(`/api/users/${user.id}`, { 
          method: 'PUT', 
          body: JSON.stringify(data) 
        });
      } else {
        return await apiRequest('/api/users', { 
          method: 'POST', 
          body: JSON.stringify(data) 
        });
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      onUserUpdated();
      onClose();
      form.reset();
      
      toast({
        title: isEditingExistingUser ? "User Updated" : "User Created",
        description: `${data.data.firstName} ${data.data.lastName} has been ${isEditingExistingUser ? 'updated' : 'created'} successfully.`
      });
    },
    onError: (error: any) => {
      console.error('User operation failed:', error);
      toast({
        title: isEditingExistingUser ? "Update Failed" : "Creation Failed",
        description: error.message || `Failed to ${isEditingExistingUser ? 'update' : 'create'} user. Please try again.`,
        variant: "destructive"
      });
    }
  });

  // Password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/users-management/${userId}/password-reset`, { 
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Password Reset Sent",
        description: data.message || "Password reset email has been sent successfully.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      console.error('Password reset failed:', error);
      toast({
        title: "Password Reset Failed", 
        description: error.message || "Failed to send password reset email. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: UserFormData) => {
    console.log('🚀 Form submitted with data:', data);
    console.log('📊 Form validation state:', form.formState.errors);
    userMutation.mutate(data);
  };

  const handlePasswordReset = () => {
    if (user?.id) {
      passwordResetMutation.mutate(user.id);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-2 shadow-2xl opacity-100" aria-describedby="modal-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditingExistingUser ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogDescription id="modal-desc">
            {isEditingExistingUser 
              ? 'Update user information, permissions, and settings' 
              : 'Create a new user account with SMS 2FA and role-based access'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error('❌ Form validation failed:', errors);
            toast({
              title: "Validation Error",
              description: "Please fix the form errors before submitting.",
              variant: "destructive"
            });
          })} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="h-4 w-4" />
                Personal Information
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter first name" 
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter last name" 
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="user@company.com" 
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Primary email for login and notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobilePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Mobile Phone * <span className="text-green-600 text-xs">(SMS 2FA)</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        placeholder="+1234567890" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          field.onChange(formatted);
                        }}
                        onBlur={(e) => {
                          // Final normalization for 2FA compliance
                          const normalized = normalizePhoneNumber(e.target.value);
                          field.onChange(normalized);
                          field.onBlur();
                        }}
                        className={
                          field.value && !isValidPhoneNumber(field.value) 
                            ? "border-red-300 focus:border-red-500" 
                            : ""
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-gray-600">
                      {getPhoneFormatHint(field.value)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Role & Department Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Shield className="h-4 w-4" />
                Role & Department
              </div>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        {ROLE_OPTIONS.map((role) => {
                          const IconComponent = role.icon;
                          return (
                            <SelectItem key={role.value} value={role.value} className="text-gray-900 hover:bg-gray-100">
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">{role.label}</div>
                                  <div className="text-xs text-muted-foreground">{role.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        {DEPARTMENT_OPTIONS.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value} className="text-gray-900 hover:bg-gray-100">
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optional - used for filtering and reporting
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Security & Access Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Shield className="h-4 w-4" />
                Security & Access
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="is2FAEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-green-600" />
                          Two-Factor Authentication
                        </FormLabel>
                        <FormDescription>
                          Require SMS verification for login
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          Account Active
                        </FormLabel>
                        <FormDescription>
                          User can log in and access the system
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-6 border-t">
              <div className="flex flex-col-reverse sm:flex-row sm:space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={userMutation.isPending}
                >
                  Cancel
                </Button>
                
                {/* Password Reset Button (only for existing users) */}
                {isEditingExistingUser && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePasswordReset}
                    disabled={passwordResetMutation.isPending || userMutation.isPending}
                    className="mb-2 sm:mb-0 text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    {passwordResetMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4 mr-2" />
                        Send password reset
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <Button
                type="submit"
                disabled={userMutation.isPending}
                className="mb-2 sm:mb-0"
                onClick={(e) => {
                  console.log('🔘 Update User button clicked');
                  console.log('📝 Current form values:', form.getValues());
                  console.log('✅ Form is valid:', form.formState.isValid);
                  console.log('❌ Form errors:', form.formState.errors);
                }}
              >
                {userMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditingExistingUser ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {isEditingExistingUser ? 'Update User' : 'Create User'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}