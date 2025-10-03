import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  formatPhoneNumber, 
  isValidPhoneNumber, 
  getPhoneFormatHint,
  normalizePhoneNumber 
} from "@/lib/phoneUtils";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Phone, Mail, Globe, Building } from "lucide-react";
import type { Lender } from "@shared/schema";

// Comprehensive validation schema matching backend
const lenderFormSchema = z.object({
  name: z.string().min(1, "Lender name is required"),
  contactName: z.string().optional(),
  contactMobilePhone: z.string().optional().refine(
    (val) => !val || isValidPhoneNumber(val), 
    "Please use international format (e.g., +1234567890)"
  ),
  contactEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  businessPhoneNumber: z.string().optional().refine(
    (val) => !val || isValidPhoneNumber(val), 
    "Please use international format for 2FA compliance"
  ),
  website: z.string().url("Valid URL required (include http:// or https://)").optional().or(z.literal("")),
  companyBio: z.string().max(1000, "Company bio must be under 1000 characters").optional()
});

type LenderFormData = z.infer<typeof lenderFormSchema>;

interface CreateEditLenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  lender?: Lender | null; // For editing existing lender
}

export default function CreateEditLenderModal({ isOpen, onClose, lender }: CreateEditLenderModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!lender;
  
  const form = useForm<LenderFormData>({
    resolver: zodResolver(lenderFormSchema),
    defaultValues: {
      name: "",
      contactName: "",
      contactMobilePhone: "",
      contactEmail: "",
      businessPhoneNumber: "",
      website: "",
      companyBio: ""
    }
  });

  // Reset form when modal opens/closes or lender changes
  useEffect(() => {
    if (isOpen) {
      if (lender) {
        // Pre-fill form for editing
        form.reset({
          name: lender.name || "",
          contactName: lender.contactName || "",
          contactMobilePhone: lender.contactMobilePhone || "",
          contactEmail: lender.contactEmail || "",
          businessPhoneNumber: lender.businessPhoneNumber || "",
          website: lender.website || "",
          companyBio: lender.companyBio || ""
        });
      } else {
        // Clear form for creating new lender
        form.reset({
          name: "",
          contactName: "",
          contactMobilePhone: "",
          contactEmail: "",
          businessPhoneNumber: "",
          website: "",
          companyBio: ""
        });
      }
    }
  }, [isOpen, lender, form]);

  // Create lender mutation
  const createLenderMutation = useMutation({
    mutationFn: async (data: LenderFormData) => {
      return apiRequest(`/api/lenders-management`, {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lenders-management"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/lenders"] });
      toast({
        title: "Success",
        description: "Lender created successfully"
      });
      onClose();
    },
    onError: (error: any) => {
      console.error("Create lender error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create lender",
        variant: "destructive"
      });
    }
  });

  // Update lender mutation
  const updateLenderMutation = useMutation({
    mutationFn: async (data: LenderFormData) => {
      return apiRequest(`/api/lenders-management/${lender?.id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lenders-management"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/lenders"] });
      toast({
        title: "Success",
        description: "Lender updated successfully"
      });
      onClose();
    },
    onError: (error: any) => {
      console.error("Update lender error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update lender",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: LenderFormData) => {
    
    if (isEditing) {
      updateLenderMutation.mutate(data);
    } else {
      createLenderMutation.mutate(data);
    }
  };

  const isLoading = createLenderMutation.isPending || updateLenderMutation.isPending;
  const bioLength = form.watch("companyBio")?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-2 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {isEditing ? `Edit ${lender?.name}` : "Create New Lender"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Lender Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Accord Financial"
                        className="font-medium"
                      />
                    </FormControl>
                    <FormDescription>
                      The official name of the lending institution
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="https://www.example.com"
                        type="url"
                      />
                    </FormControl>
                    <FormDescription>
                      Official website URL (include http:// or https://)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyBio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Brief description of the lender's services, specialties, and key offerings..."
                        className="min-h-24"
                        maxLength={1000}
                      />
                    </FormControl>
                    <FormDescription className="flex justify-between">
                      <span>Optional description of the lender's business</span>
                      <span className={bioLength > 900 ? "text-orange-600" : "text-muted-foreground"}>
                        {bioLength}/1000 characters
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
              
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., John Smith"
                      />
                    </FormControl>
                    <FormDescription>
                      Primary contact person at the lender
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Contact Email
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="contact@lender.com"
                          type="email"
                        />
                      </FormControl>
                      <FormDescription>
                        Primary email for communication
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactMobilePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Contact Mobile Phone
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="+1234567890"
                          type="tel"
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            field.onChange(formatted);
                          }}
                          onBlur={(e) => {
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
                      <FormDescription>
                        {getPhoneFormatHint(field.value)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="businessPhoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Business Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="+1234567890"
                        type="tel"
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          field.onChange(formatted);
                        }}
                        onBlur={(e) => {
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
                    <FormDescription>
                      {getPhoneFormatHint(field.value)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="min-w-24"
              >
                {isLoading ? "Saving..." : isEditing ? "Update Lender" : "Create Lender"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}