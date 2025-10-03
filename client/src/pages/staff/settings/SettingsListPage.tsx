import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation } from 'wouter';
import { Settings, Users, Shield, Database, Bell, Zap, HelpCircle, Plug, BarChart3, Building2 } from 'lucide-react';
// Removed unused useToast import
import { lower } from '@/lib/dedupe';
import SiloSwitcher from '@/components/layout/SiloSwitcher';
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
        badge: '16 Users',
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
    title: 'Data & System Settings',
    description: 'Database configuration and system preferences',
    priority: 2,
    items: [
      {
        title: 'Database Settings',
        description: 'Connection pooling, backup schedules, and performance tuning',
        icon: Database,
        path: '/staff/settings/database',
        status: 'active' as const
      },
      {
        title: 'System Preferences',
        description: 'Application-wide settings and default configurations',
        icon: Settings,
        path: '/staff/settings/system',
        status: 'active' as const
      }
    ]
  },
  {
    title: 'Connected Accounts & Integrations',
    description: 'OAuth integrations and external service connections',
    priority: 3,
    items: [
      {
        title: 'Connected Accounts',
        description: 'LinkedIn, Google Ads, Microsoft 365, beneficial integrations',
        icon: Plug,
        path: '/staff/settings/integrations',
        badge: '4 Connected',
        badgeVariant: 'default' as const,
        status: 'active' as const
      }
    ]
  },
  {
    title: 'Communication Settings',
    description: 'Notification preferences and communication channels',
    priority: 4,
    items: [
      {
        title: 'Notification Settings',
        description: 'Email alerts, SMS notifications, and in-app messages',
        icon: Bell,
        path: '/staff/settings/notifications',
        status: 'active' as const
      }
    ]
  },
  {
    title: 'Reporting & Analytics',
    description: 'Business intelligence and performance tracking',
    priority: 5,
    items: [
      {
        title: 'Analytics Configuration',
        description: 'Google Analytics integration and custom metrics',
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

function matchUserMgmt(pathname: string, search: string) {
  const p = lower(pathname.replace(/\/+$/, ""));
  if (p.endsWith("/settings/user-management")) return true;
  const qs = new URLSearchParams(search);
  return lower(qs.get("tab") || "") === "user-management";
}

export default function SettingsListPage() {
  // Removed unused toast hook
  const [, navigate] = useLocation();
  
  // Check both path segments and query parameters for user-management
  if (matchUserMgmt(window.location.pathname, window.location.search)) {
    return <UserManagementPage />;
  }
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalContacts: 0,
    activeIntegrations: 4
  });
  const [loading, setLoading] = useState(true);

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
          fetch('/api/user-management', { headers }),
          fetch('/api/contacts', { headers })
        ]);

        const users = await usersResponse.json();
        const contacts = await contactsResponse.json();

        setSystemStats({
          totalUsers: users.length || 0,
          activeUsers: users.filter((u: any) => u.isActive).length || 0,
          totalContacts: contacts.length || 0,
          activeIntegrations: 4 // LinkedIn, Google Ads, O365, SendGrid
        });
      } catch (error) {
        console.error('Failed to fetch system stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemStats();
  }, []);

  // New SPA navigation function for Configure buttons
  const openTab = (tab: string) => navigate(`list?tab=${encodeURIComponent(tab)}`);

  const handleConfigureClick = (item: SettingsItem, e: React.MouseEvent) => {
    // Handle different settings items with proper SPA navigation
    e.preventDefault();
    e.stopPropagation();
    console.log('🔧 Configure clicked for:', item.title, 'navigating to:', item.path);
    switch (item.title) {
      case 'User Management':
        console.log('🎯 Navigating to User Management page...');
        navigate("user-management"); // relative navigation
        break;
      
      case 'Role Management':
        openTab("roles");
        break;
      
      case 'Database Settings':
        openTab("database");
        break;
        
      case 'System Preferences':
        openTab("system");
        break;
        
      case 'Connected Accounts':
        openTab("integrations");
        break;
        
      case 'Notification Settings':
        openTab("notifications");
        break;
        
      case 'Analytics Configuration':
        openTab("analytics");
        break;
        
      case 'Performance Monitoring':
        openTab("performance");
        break;
        
      case 'System Diagnostics':
        openTab("diagnostics");
        break;
        
      default:
        console.log('No specific handler for:', item.title);
        openTab(lower(item.title).replace(/\s+/g, '-'));
        break;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Active' },
      inactive: { variant: 'secondary' as const, label: 'Inactive' },
      warning: { variant: 'destructive' as const, label: 'Warning' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Silo Switcher */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings & Configuration</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Current system overview and key metrics</p>
        </div>
        <SiloSwitcher />
      </div>

      {/* System Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {loading ? '...' : systemStats.totalUsers}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {loading ? '...' : systemStats.activeUsers}
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Contacts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {loading ? '...' : systemStats.totalContacts}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Connected Services</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {systemStats.activeIntegrations}
                </p>
              </div>
              <Plug className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Categories */}
      <div className="space-y-6">
        {settingsCategories
          .sort((a, b) => a.priority - b.priority)
          .map((category) => {
            return (
              <Card key={category.title}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {category.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {category.items.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <div key={item.title} className="flex items-start space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex-shrink-0">
                            <IconComponent className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {item.title}
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                            {item.status && getStatusBadge(item.status)}
                            <Link to={item.title === 'User Management' ? 'user-management' : `list?tab=${lower(item.title).replace(/\s+/g, '-')}`}>
                              <Button
                                type="button"
                                onClick={(e) => handleConfigureClick(item, e)}
                                variant="outline"
                                size="sm"
                                className="pointer-events-auto relative z-10"
                                data-testid={item.title === 'User Management' ? 'btn-configure-user-mgmt' : `btn-configure-${lower(item.title).replace(/\s+/g, '-')}`}
                              >
                                Configure
                              </Button>
                            </Link>
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
  );
}


