import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  MapPin,
  Building,
  Calendar,
  FileText,
  User,
} from "lucide-react";
import { lower } from "@/lib/dedupe";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  address?: string;
  status: string;
  createdAt: string;
  lastInteraction?: string;
  notes?: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: string;
  }>;
}

interface ContactRecordProps {
  contactId: string;
}

export default function ContactRecord({ contactId }: ContactRecordProps) {
  const {
    data: contact,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}`);
      if (!response.ok) throw new Error("Failed to fetch contact");
      return response.json();
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["contact-notes", contactId],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}/notes`);
      if (!response.ok) return [];
      const result = await response.json();
      return result.items || [];
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">
                Contact Not Found
              </h3>
              <p className="text-gray-600">
                The contact you're looking for doesn't exist or has been
                removed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (lower(status)) {
      case "active":
        return "bg-green-100 text-green-800";
      case "lead":
        return "bg-blue-100 text-blue-800";
      case "customer":
        return "bg-purple-100 text-purple-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{contact.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge className={getStatusColor(contact.status)}>
              {contact.status}
            </Badge>
            {contact.company && (
              <span className="text-gray-600 flex items-center gap-1">
                <Building className="h-4 w-4" />
                {contact.company}
              </span>
            )}
            {contact.title && (
              <span className="text-gray-500">• {contact.title}</span>
            )}
          </div>
        </div>
        {/* action buttons removed per design */}
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{contact.email}</p>
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{contact.phone}</p>
                </div>
              </div>
            )}
            {contact.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">{contact.address}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium">
                  {new Date(contact.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {contact.lastInteraction && (
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Last Interaction</p>
                  <p className="font-medium">
                    {new Date(contact.lastInteraction).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Notes ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length > 0 ? (
            <div className="space-y-4">
              {notes.slice(0, 5).map((note: any) => (
                <div
                  key={note.id}
                  className="border-l-4 border-blue-500 pl-4 py-2"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-gray-700">{note.html || note.body}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {note.authorId && (
                    <p className="text-xs text-gray-500 mt-1">
                      by {note.authorId}
                    </p>
                  )}
                </div>
              ))}
              {notes.length > 5 && (
                <Button variant="outline" size="sm" className="w-full">
                  View All Notes ({notes.length})
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Notes Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start documenting your interactions with this contact.
              </p>
              {/* Add First Note button removed per design */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
