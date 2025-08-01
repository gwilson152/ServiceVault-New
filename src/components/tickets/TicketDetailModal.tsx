"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AccountSelector } from "@/components/selectors/account-selector";
import { QuickTimeEntry } from "@/components/time/QuickTimeEntry";
import { AddonsManagement } from "@/components/tickets/AddonsManagement";
import { 
  Edit, 
  Save, 
  X, 
  Clock, 
  Plus, 
  Trash2,
  AlertCircle,
  CheckCircle,
  User,
  Building,
  Calendar,
  FileText
} from "lucide-react";
import { formatMinutes } from "@/lib/time-utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Account {
  id: string;
  name: string;
  accountType: string;
  parentAccountId?: string | null;
}

interface TimeEntry {
  id: string;
  description: string;
  minutes: number;
  date: string;
  noCharge: boolean;
  user: User;
  createdAt: string;
}

interface TicketAddon {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  accountId: string;
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
  customFields?: Record<string, unknown>;
  account: Account;
  assignee?: User;
  creator?: User;
  totalTimeSpent: number;
  totalAddonCost: number;
  timeEntriesCount: number;
  addonsCount: number;
  timeEntries?: TimeEntry[];
  addons?: TicketAddon[];
}

interface CustomField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

interface TicketDetailModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedTicket: Ticket) => void;
  canEdit: boolean;
  accounts: Account[];
  users: User[];
  customFields: CustomField[];
}

export function TicketDetailModal({
  ticket,
  isOpen,
  onClose,
  onUpdate,
  canEdit,
  accounts,
  users,
  customFields
}: TicketDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  // Form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editCustomFields, setEditCustomFields] = useState<Record<string, unknown>>({});

  // Data state
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [addons, setAddons] = useState<TicketAddon[]>([]);
  const [isLoadingTimeEntries, setIsLoadingTimeEntries] = useState(false);

  // Define load functions first
  const loadTimeEntries = useCallback(async () => {
    if (!ticket) return;
    
    setIsLoadingTimeEntries(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/time-entries`);
      if (response.ok) {
        const data = await response.json();
        setTimeEntries(data);
      }
    } catch (error) {
      console.error("Error loading time entries:", error);
    } finally {
      setIsLoadingTimeEntries(false);
    }
  }, [ticket]);

  const loadAddons = useCallback(async () => {
    if (!ticket) return;
    
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/addons`);
      if (response.ok) {
        const data = await response.json();
        setAddons(data);
      }
    } catch (error) {
      console.error("Error loading addons:", error);
    }
  }, [ticket]);

  // Reset form when ticket changes
  useEffect(() => {
    if (ticket) {
      setEditTitle(ticket.title);
      setEditDescription(ticket.description);
      setEditStatus(ticket.status);
      setEditPriority(ticket.priority);
      setEditAccountId(ticket.accountId);
      setEditAssigneeId(ticket.assigneeId || "unassigned");
      setEditCustomFields(ticket.customFields || {});
      setIsEditing(false);
    }
  }, [ticket]);

  // Load detailed data when modal opens
  useEffect(() => {
    if (isOpen && ticket) {
      loadTimeEntries();
      loadAddons();
    }
  }, [isOpen, ticket, loadTimeEntries, loadAddons]);

  const handleSave = async () => {
    if (!ticket) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          status: editStatus,
          priority: editPriority,
          accountId: editAccountId,
          assigneeId: editAssigneeId === "unassigned" ? null : editAssigneeId,
          customFields: editCustomFields,
        }),
      });

      if (response.ok) {
        const updatedTicket = await response.json();
        onUpdate?.(updatedTicket);
        setIsEditing(false);
      } else {
        const error = await response.json();
        console.error("Error updating ticket:", error);
        alert("Failed to update ticket: " + error.error);
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      alert("Failed to update ticket");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "OPEN": return "destructive";
      case "IN_PROGRESS": return "default";
      case "RESOLVED": return "outline";
      case "CLOSED": return "secondary";
      default: return "secondary";
    }
  };

  const getPriorityColor = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case "HIGH": return "destructive";
      case "MEDIUM": return "default";
      case "LOW": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN": return <AlertCircle className="h-4 w-4" />;
      case "IN_PROGRESS": return <Clock className="h-4 w-4" />;
      case "RESOLVED": return <CheckCircle className="h-4 w-4" />;
      case "CLOSED": return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const renderCustomFieldValue = (field: CustomField) => {
    const value = ticket?.customFields?.[field.name];
    if (!value) return "—";
    return value;
  };

  const renderCustomFieldInput = (field: CustomField) => {
    const value = editCustomFields[field.name] || "";
    
    switch (field.type) {
      case "text":
        return (
          <Input
            value={value}
            onChange={(e) => setEditCustomFields(prev => ({
              ...prev,
              [field.name]: e.target.value
            }))}
            placeholder={field.label}
            required={field.required}
          />
        );
      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => setEditCustomFields(prev => ({
              ...prev,
              [field.name]: e.target.value
            }))}
            placeholder={field.label}
            required={field.required}
            rows={3}
          />
        );
      case "select":
        return (
          <Select 
            value={value} 
            onValueChange={(newValue) => setEditCustomFields(prev => ({
              ...prev,
              [field.name]: newValue
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(ticket.status)}
              <DialogTitle className="text-xl">
                {ticket.ticketNumber}
              </DialogTitle>
              <Badge variant={getStatusColor(ticket.status)}>
                {ticket.status}
              </Badge>
              <Badge variant={getPriorityColor(ticket.priority)}>
                {ticket.priority}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Time Tracking Controls */}
              <QuickTimeEntry
                ticketId={ticket.id}
                ticketTitle={ticket.title}
                onTimeLogged={() => {
                  loadTimeEntries();
                  onUpdate?.(ticket);
                }}
              />
              
              {canEdit && (
                <>
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="time">
              Time ({ticket.timeEntriesCount})
            </TabsTrigger>
            <TabsTrigger value="addons">
              Addons ({ticket.addonsCount})
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Main Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ticket Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    {isEditing ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Ticket title"
                      />
                    ) : (
                      <p className="text-sm font-medium">{ticket.title}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    {isEditing ? (
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Ticket description"
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{ticket.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      {isEditing ? (
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={getStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      {isEditing ? (
                        <Select value={editPriority} onValueChange={setEditPriority}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="LOW">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment & Account */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Account</Label>
                    {isEditing ? (
                      <AccountSelector
                        accounts={accounts}
                        value={editAccountId}
                        onValueChange={setEditAccountId}
                        placeholder="Select account"
                        enableFilters={true}
                        enableGrouping={true}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{ticket.account.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {ticket.account.accountType}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Assigned To</Label>
                    {isEditing ? (
                      <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {ticket.assignee ? ticket.assignee.name : "Unassigned"}
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Created By</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {ticket.creator?.name || "System"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Created At</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Custom Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map((field) => (
                      <div key={field.name} className="space-y-2">
                        <Label>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {isEditing ? (
                          renderCustomFieldInput(field)
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {renderCustomFieldValue(field)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatMinutes(ticket.totalTimeSpent)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {ticket.timeEntriesCount}
                    </div>
                    <div className="text-sm text-muted-foreground">Time Entries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      ${ticket.totalAddonCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Addon Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {ticket.addonsCount}
                    </div>
                    <div className="text-sm text-muted-foreground">Addons</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time Entries Tab */}
          <TabsContent value="time" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Time Entries</h3>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Time Entry
              </Button>
            </div>

            {isLoadingTimeEntries ? (
              <div className="text-center py-8">Loading time entries...</div>
            ) : timeEntries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No time entries</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    No time has been logged for this ticket yet.
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Log First Entry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {timeEntries.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{formatMinutes(entry.minutes)}</span>
                            <Badge variant={entry.noCharge ? "secondary" : "default"}>
                              {entry.noCharge ? "No Charge" : "Billable"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              by {entry.user.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              on {new Date(entry.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{entry.description}</p>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Addons Tab */}
          <TabsContent value="addons" className="space-y-4">
            <AddonsManagement
              ticketId={ticket.id}
              addons={addons}
              onAddonsChange={() => {
                loadAddons();
                onUpdate?.(ticket);
              }}
              canEdit={canEdit}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <h3 className="text-lg font-semibold">Activity History</h3>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">History Coming Soon</h3>
                <p className="text-muted-foreground text-center">
                  Activity history and audit log will be available in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}