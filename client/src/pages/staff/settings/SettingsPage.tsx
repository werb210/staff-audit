import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { Settings, Users, Shield, Database, Sliders, Bell, Zap, HelpCircle, Plug, BarChart3, Building2 } from 'lucide-react';
// Removed unused useToast import
import { lower } from '@/lib/dedupe';
// Removed unused SiloSwitcher import
// useLocation now imported above
import UserManagementPage from './UserManagementPage';

interface SettingsItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  status?: 'active' | 'inactive' | 'warning';
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalContacts: number;
  activeIntegrations: number;
}

const settingsCategories = [
  {
    title: 'User Management',
    description: 'Comprehensive user management with Twilio verification and role-based access',
    priority: 1,
    items: [
      {
        title: 'User Management',
        description: 'Create users, manage permissions, password reset with Twilio verification',
        icon: Users,
        path: '/staff/settings/user-management',
        status: 'active' as const
      },
      {
        title: 'Role Management',
        description: 'Configure user roles and department access levels',
        icon: Shield,
        path: '/staff/settings/roles',
        status: 'active' as const
      }
    ]
  },
  {
    title: 'Connected Accounts & Integrations',
    description: 'OAuth integrations and external service connections',
    priority: 2,
    items: [
      {
        title: 'Connected Accounts',
        description: 'LinkedIn, Google Ads, Microsoft 365, SendGrid integrations',
        icon: Plug,
        path: '/staff/settings/integrations',
        badge: '4 Connected',
        status: 'active' as const
      },
      {
        title: 'Refresh Application Data',
        description: 'Update application cards with complete field data and document information',
        icon: Database,
        path: '/staff/settings/refresh-data',
        badge: 'System',
        badgeVariant: 'secondary' as const,
        status: 'active' as const
      },
      {
        title: 'API Configuration',
        description: 'Configure API keys and authentication settings',
        icon: Sliders,
        path: '/staff/settings/api-config',
        status: 'active' as const
      }
    ]
  },
  {
    title: 'Business Configuration',
    description: 'Core business settings and operational preferences',
    priority: 3,
    items: [
      {
        title: 'Company Settings',
        description: 'Business information, branding, and operational hours',
        icon: Building2,
        path: '/staff/settings/company',
        status: 'active' as const
      },
      {
        title: 'System Preferences',
        description: 'Global system settings and defaults',
        icon: Settings,
        path: '/staff/settings/system',
        status: 'active' as const
      }
    ]
  },
  {
    title: 'Communication & Notifications',
    description: 'Email, SMS, and notification preferences',
    priority: 4,
    items: [
      {
        title: 'Notifications',
        description: 'Configure email and SMS notification preferences',
        icon: Bell,
        path: '/staff/settings/notifications',
        status: 'active' as const
      },
      {
        title: 'Communication Templates',
        description: 'Manage email and SMS templates',
        icon: Database,
        path: '/staff/settings/templates',
        status: 'active' as const
      }
    ]
  },
  {
    title: 'Analytics & Reporting',
    description: 'System monitoring and performance analytics',
    priority: 5,
    items: [
      {
        title: 'System Analytics',
        description: 'Performance metrics and usage statistics',
        icon: BarChart3,
        path: '/staff/settings/analytics',
        status: 'active' as const
      },
      {
        title: 'Performance Monitoring',
        description: 'System health and optimization tools',
        icon: Zap,
        path: '/staff/settings/performance',
        status: 'active' as const
      }
    ]
  },
  {
    title: 'Support & Maintenance',
    description: 'System diagnostics and support tools',
    priority: 6,
    items: [
      {
        title: 'System Diagnostics',
        description: 'Database health, connection status, and system logs',
        icon: HelpCircle,
        path: '/staff/settings/diagnostics',
        status: 'active' as const
      }
    ]
  }
];

export default function SettingsPage() {
  // Removed unused toast hook
  const [, navigate] = useLocation();
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalContacts: 0,
    activeIntegrations: 4
  });
  // Removed unused loading state

  // Fetch system statistics
  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        // Get auth token for authenticated API calls
        const token = localStorage.getItem('token') || sessionStorage.getItem('bf_auth');
        const headers: HeadersInit = { 'Accept': 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        const [usersResponse, contactsResponse] = await Promise.all([
          fetch('/api/settings/users', { headers }),
          fetch('/api/contacts', { headers })
        ]);

        const usersData = await usersResponse.json().catch(() => null);
        const contactsData = await contactsResponse.json().catch(() => null);

        // Safe array normalization to prevent .filter crashes
        const users = Array.isArray(usersData?.users) ? usersData.users
                    : Array.isArray(usersData?.items) ? usersData.items
                    : Array.isArray(usersData) ? usersData
                    : [];
        const contacts = Array.isArray(contactsData?.items) ? contactsData.items
                       : Array.isArray(contactsData) ? contactsData
                       : [];

        setSystemStats({
          totalUsers: users.length || 0,
          activeUsers: users.filter((u: any) => u?.isActive || u?.active).length || 0,
          totalContacts: contacts.length || 0,
          activeIntegrations: 4 // LinkedIn, Google Ads, O365, SendGrid
        });
      } catch (error) {
        console.error('Failed to fetch system stats:', error);
      } finally {
        // Removed setLoading call (state was removed)
      }
    };

    fetchSystemStats();
  }, []);

  // Navigation function for Configure buttons

  const handleConfigureClick = (item: SettingsItem, e: React.MouseEvent) => {
    // Handle different settings items with proper SPA navigation
    e.preventDefault();
    e.stopPropagation();
    
    if (!item?.title) {
      console.warn('⚠️ No item title provided');
      return;
    }
    
    console.log('🔧 Configure clicked for:', item.title, 'navigating to:', item.path);
    switch (item.title) {
      case 'User Management':
        console.log('🎯 Opening User Management page...');
        // FIXED: Use relative navigation to prevent auth re-checks
        navigate("/staff/settings/user-management");
        break;
      case 'Twilio Dialer':
        navigate("/staff/settings/twilio");
        break;
      case 'Lenders':
        navigate("/staff/settings/lenders");
        break;
      case 'Documents':
        navigate("/staff/settings/documents");
        break;
      case 'Security':
        navigate("/staff/settings/security");
        break;
      default:
        console.log('🔧 Configure clicked for:', item.title);
        alert(`${item.title} configuration page coming soon!`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default" className="text-xs">Active</Badge>;
      case 'warning': return <Badge variant="outline" className="text-xs">Warning</Badge>;
      case 'inactive': return <Badge variant="secondary" className="text-xs">Inactive</Badge>;
      default: return null;
    }
  };

  // Update badges with real data
  const getCategoryWithStats = (category: any) => {
    const updatedItems = category.items.map((item: any) => {
      let badge = item.badge;
      if (item.path === '/staff/settings/user-management') {
        badge = `${systemStats.activeUsers}/${systemStats.totalUsers} Active`;
      } else if (item.path === '/staff/settings/integrations') {
        badge = `${systemStats.activeIntegrations} Connected`;
      }
      return { ...item, badge };
    });
    return { ...category, items: updatedItems };
  };

  return (
    <div>
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-2xl font-bold">Settings & Configuration</h2>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{systemStats.totalUsers} Users</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>{systemStats.totalContacts} Contacts</span>
          </div>
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span>{systemStats.activeIntegrations} Integrations</span>
          </div>
        </div>
      </div>

      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Overview</CardTitle>
          <CardDescription>
            Current system status and key metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{systemStats.activeUsers}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemStats.totalContacts}</div>
              <div className="text-sm text-muted-foreground">Total Contacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{systemStats.activeIntegrations}</div>
              <div className="text-sm text-muted-foreground">Connected Services</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">99.9%</div>
              <div className="text-sm text-muted-foreground">System Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Categories */}
      <div className="grid gap-6">
        {settingsCategories
          .sort((a, b) => a.priority - b.priority)
          .map((category, index) => {
            const categoryWithStats = getCategoryWithStats(category);
            return (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{categoryWithStats.title}</CardTitle>
                  <CardDescription>{categoryWithStats.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {categoryWithStats.items.map((item: any, itemIndex: number) => {
                      const IconComponent = item.icon;
                      return (
                        <div key={itemIndex} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors hover:border-primary/20">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-muted">
                              <IconComponent className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{item.title}</div>
                              <div className="text-sm text-muted-foreground">{item.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {item.badge && (
                              <Badge variant={item.badgeVariant || 'secondary'} className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                            {item.status && getStatusBadge(item.status)}
                            <Button
                              type="button"
                              onClick={(e) => handleConfigureClick(item, e)}
                              variant="outline"
                              size="sm"
                              className="pointer-events-auto relative z-10"
                              data-testid={item.title === 'User Management' ? 'btn-configure-user-mgmt' : `btn-configure-${lower(item.title || '').replace(/\\s+/g, '-')}`}
                            >
                              Configure
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
      </div>
      
      {/* 👇 This renders the child route content based on URL */}
      {(() => {
        const [pathname] = useLocation();
        
        if (pathname.includes('user-management')) {
          return <UserManagementPage />;
        }
        
        return null; // Child routes handled by routing system
      })()}
    </div>
  );
}