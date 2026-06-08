/**
 * Slack Integration Panel
 * 
 * Admin interface for configuring Slack workspace connections
 * - Connect new Slack workspaces
 * - Configure channel mappings per property
 * - Test connections
 * - View integration logs
 * - Manage bot permissions
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Hash, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Save,
  Copy,
  ExternalLink,
  Terminal,
  Webhook,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SlackIntegration, SlackCommandLog, SlackInteraction } from '@/types/slack';
import { SLACK_COMMANDS, DEFAULT_CHANNEL_MAPPINGS } from '@/types/slack';

export function SlackIntegrationPanel() {
  const [activeTab, setActiveTab] = useState('integrations');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<SlackIntegration | null>(null);
  const [testEndpoint, setTestEndpoint] = useState('slack-events');
  const [testResult, setTestResult] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch Slack integrations
  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ['slack-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slack_integrations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SlackIntegration[];
    },
  });

  // Fetch properties
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch command logs
  const { data: commandLogs } = useQuery({
    queryKey: ['slack-command-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slack_commands_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as SlackCommandLog[];
    },
    enabled: activeTab === 'logs',
  });

  // Add integration mutation
  const addIntegrationMutation = useMutation({
    mutationFn: async (values: {
      property_id: string;
      workspace_name: string;
      channel_mappings: Record<string, string>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('slack_integrations')
        .insert({
          property_id: values.property_id,
          workspace_name: values.workspace_name,
          channel_mappings: values.channel_mappings,
          is_active: true,
          connection_status: 'pending',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-integrations'] });
      toast.success('Slack integration added successfully');
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to add integration: ' + error.message);
    },
  });

  // Toggle integration mutation
  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('slack_integrations')
        .update({ 
          is_active,
          connection_status: is_active ? 'pending' : 'disabled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-integrations'] });
      toast.success('Integration updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  // Test endpoint mutation
  const testEndpointMutation = useMutation({
    mutationFn: async (endpoint: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
          body: JSON.stringify({ test_mode: true }),
        }
      );
      
      const data = await response.json();
      return { status: response.status, data };
    },
    onSuccess: (result) => {
      setTestResult(JSON.stringify(result.data, null, 2));
      if (result.status === 200) {
        toast.success('Test successful!');
      } else {
        toast.error(`Test failed with status ${result.status}`);
      }
    },
    onError: (error) => {
      setTestResult(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Test failed');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'disabled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <RefreshCw className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Slack Integration</h2>
          <p className="text-muted-foreground">
            Manage Slack bot connections for notifications and commands
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Workspace
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="integrations">
            <MessageSquare className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="commands">
            <Terminal className="w-4 h-4 mr-2" />
            Commands
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Webhook className="w-4 h-4 mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="testing">
            <Shield className="w-4 h-4 mr-2" />
            Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          {integrationsLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : integrations?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Slack Integrations</h3>
                <p className="text-muted-foreground mb-4">
                  Connect a Slack workspace to enable bot notifications and commands
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Connect Slack
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                          <Hash className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-lg">{integration.workspace_name}</h3>
                            <Badge className={getStatusColor(integration.connection_status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(integration.connection_status)}
                                {integration.connection_status}
                              </span>
                            </Badge>
                            {integration.is_active && (
                              <Badge variant="outline">Active</Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-1">
                            Property: {properties?.find(p => p.id === integration.property_id)?.name || 'Unknown'}
                          </p>

                          {integration.last_error_message && (
                            <p className="text-sm text-red-600 mt-2">
                              Error: {integration.last_error_message}
                            </p>
                          )}
                          
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Channel Mappings</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(integration.channel_mappings || {}).map(([type, channel]) => (
                                <Badge key={type} variant="secondary" className="text-xs">
                                  {type}: {channel}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {integration.last_connected_at && (
                            <p className="text-xs text-muted-foreground mt-3">
                              Last connected: {new Date(integration.last_connected_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={integration.is_active}
                          onCheckedChange={(checked) => 
                            toggleIntegrationMutation.mutate({ id: integration.id, is_active: checked })
                          }
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this integration?')) {
                              supabase.from('slack_integrations').delete().eq('id', integration.id).then(() => {
                                queryClient.invalidateQueries({ queryKey: ['slack-integrations'] });
                                toast.success('Integration deleted');
                              });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="commands" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Slack Commands</CardTitle>
              <CardDescription>
                These commands are available to users in connected Slack workspaces
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {SLACK_COMMANDS.map((cmd) => (
                  <div key={cmd.command} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {cmd.command}
                      </code>
                      <Badge variant="outline">
                        {cmd.access === 'all' ? 'Everyone' : 
                         cmd.access === 'dept_head' ? 'Dept Head+' :
                         cmd.access === 'manager' ? 'Manager+' : 'Regional+'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{cmd.description}</p>
                    {cmd.usage && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Usage: <code>{cmd.usage}</code>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">1. Create a Slack App</h4>
                <p className="text-sm text-muted-foreground">
                  Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">api.slack.com/apps</a> and create a new app.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">2. Configure Event Subscriptions</h4>
                <p className="text-sm text-muted-foreground">Add this Request URL:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded text-xs truncate">
                    {import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-events
                  </code>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-events`);
                      toast.success('Copied to clipboard');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">3. Add Slash Commands</h4>
                <p className="text-sm text-muted-foreground">Configure each command with this Request URL:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded text-xs truncate">
                    {import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-commands
                  </code>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-commands`);
                      toast.success('Copied to clipboard');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">4. Configure Interactive Components</h4>
                <p className="text-sm text-muted-foreground">Set the Request URL for interactions:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded text-xs truncate">
                    {import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-interactive
                  </code>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-interactive`);
                      toast.success('Copied to clipboard');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Command Logs</CardTitle>
              <CardDescription>
                Recent Slack command usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {commandLogs?.map((log) => (
                    <div key={log.id} className="p-3 border rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <code className="font-mono text-xs">{log.command}</code>
                        <Badge variant={log.success ? 'default' : 'destructive'} className="text-xs">
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        {log.text || '(no text)'}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {!commandLogs?.length && (
                    <p className="text-center text-muted-foreground py-8">No command logs yet</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Endpoints</CardTitle>
              <CardDescription>
                Test Slack integration endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Select value={testEndpoint} onValueChange={setTestEndpoint}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slack-events">slack-events</SelectItem>
                    <SelectItem value="slack-commands">slack-commands</SelectItem>
                    <SelectItem value="slack-interactive">slack-interactive</SelectItem>
                    <SelectItem value="slack-training">slack-training</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => testEndpointMutation.mutate(testEndpoint)}
                  disabled={testEndpointMutation.isPending}
                >
                  {testEndpointMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  Test Endpoint
                </Button>
              </div>

              {testResult && (
                <div className="p-4 bg-muted rounded-lg">
                  <pre className="text-xs overflow-auto">{testResult}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Integration Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect Slack Workspace</DialogTitle>
            <DialogDescription>
              Add a new Slack workspace for notifications and commands
            </DialogDescription>
          </DialogHeader>
          
          <AddIntegrationForm 
            properties={properties || []}
            onSubmit={(values) => addIntegrationMutation.mutate(values)}
            isSubmitting={addIntegrationMutation.isPending}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Add Integration Form Component
// ============================================================================

interface AddIntegrationFormProps {
  properties: Array<{ id: string; name: string }>;
  onSubmit: (values: {
    property_id: string;
    workspace_name: string;
    channel_mappings: Record<string, string>;
  }) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

function AddIntegrationForm({ properties, onSubmit, isSubmitting, onCancel }: AddIntegrationFormProps) {
  const [propertyId, setPropertyId] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [channelMappings, setChannelMappings] = useState<Record<string, string>>({
    general: '#general',
    'training-hub': '#training-hub',
    operations: '#operations',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      property_id: propertyId,
      workspace_name: workspaceName,
      channel_mappings: channelMappings,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="property">Property</Label>
        <Select value={propertyId} onValueChange={setPropertyId} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workspace">Workspace Name</Label>
        <Input
          id="workspace"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="My Hotel Slack"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Channel Mappings</Label>
        <div className="space-y-2">
          {DEFAULT_CHANNEL_MAPPINGS.slice(0, 4).map((mapping) => (
            <div key={mapping.channel_type} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-32">{mapping.channel_type}</span>
              <Input
                value={channelMappings[mapping.channel_type] || mapping.channel_name}
                onChange={(e) => setChannelMappings({
                  ...channelMappings,
                  [mapping.channel_type]: e.target.value,
                })}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !propertyId || !workspaceName}>
          {isSubmitting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
          Connect Workspace
        </Button>
      </DialogFooter>
    </form>
  );
}
