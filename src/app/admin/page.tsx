"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Plus, Trash2, Mail, Globe, AlertTriangle } from "lucide-react";

interface BlacklistEntry {
  id: string;
  email?: string;
  ipAddress?: string;
  reason: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  blocker: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [blacklistEntries, setBlacklistEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    email: "",
    ipAddress: "",
    reason: "",
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      redirect("/api/auth/signin");
      return;
    }

    if (session.user?.role !== "ADMIN") {
      redirect("/dashboard");
      return;
    }
  }, [session, status]);

  // Fetch blacklist entries
  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchBlacklistEntries();
    }
  }, [session]);

  const fetchBlacklistEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/blacklist");
      if (response.ok) {
        const data = await response.json();
        setBlacklistEntries(data);
      } else {
        setError("Failed to fetch blacklist entries");
      }
    } catch (error) {
      setError("Error fetching blacklist entries");
    } finally {
      setLoading(false);
    }
  };

  const addBlacklistEntry = async () => {
    try {
      if (!newEntry.reason.trim()) {
        setError("Reason is required");
        return;
      }

      if (!newEntry.email.trim() && !newEntry.ipAddress.trim()) {
        setError("Either email or IP address must be provided");
        return;
      }

      const response = await fetch("/api/blacklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEntry),
      });

      if (response.ok) {
        const data = await response.json();
        setBlacklistEntries([data, ...blacklistEntries]);
        setNewEntry({ email: "", ipAddress: "", reason: "" });
        setIsAddDialogOpen(false);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to add blacklist entry");
      }
    } catch (error) {
      setError("Error adding blacklist entry");
    }
  };

  const removeBlacklistEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/blacklist?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setBlacklistEntries(blacklistEntries.filter(entry => entry.id !== id));
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to remove blacklist entry");
      }
    } catch (error) {
      setError("Error removing blacklist entry");
    }
  };

  if (status === "loading") {
    return <div className="p-6">Loading...</div>;
  }

  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">System administration and management</p>
        </div>
      </div>

      <Tabs defaultValue="blacklist" className="space-y-4">
        <TabsList>
          <TabsTrigger value="blacklist">Blacklist Management</TabsTrigger>
          {/* Future admin features can be added here */}
        </TabsList>

        <TabsContent value="blacklist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Blacklist Management
                  </CardTitle>
                  <CardDescription>
                    Manage blocked emails and IP addresses to prevent access to the system
                  </CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Blacklist Entry</DialogTitle>
                      <DialogDescription>
                        Block an email address or IP address from accessing the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="user@example.com"
                          value={newEntry.email}
                          onChange={(e) => setNewEntry({ ...newEntry, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ipAddress">IP Address</Label>
                        <Input
                          id="ipAddress"
                          placeholder="192.168.1.1"
                          value={newEntry.ipAddress}
                          onChange={(e) => setNewEntry({ ...newEntry, ipAddress: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="reason">Reason *</Label>
                        <Textarea
                          id="reason"
                          placeholder="Reason for blocking..."
                          value={newEntry.reason}
                          onChange={(e) => setNewEntry({ ...newEntry, reason: e.target.value })}
                          required
                        />
                      </div>
                      {error && (
                        <Alert>
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addBlacklistEntry}>Add Entry</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading blacklist entries...</div>
              ) : blacklistEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No blacklist entries found
                </div>
              ) : (
                <div className="space-y-3">
                  {blacklistEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {entry.email && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {entry.email}
                            </Badge>
                          )}
                          {entry.ipAddress && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {entry.ipAddress}
                            </Badge>
                          )}
                          <Badge variant={entry.isActive ? "destructive" : "outline"}>
                            {entry.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{entry.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          Blocked by {entry.blocker.name} on {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {entry.isActive && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeBlacklistEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}