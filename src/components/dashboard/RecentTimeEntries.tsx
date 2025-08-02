"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Calendar, User, FileText, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface TimeEntry {
  id: string;
  date: string;
  minutes: number;
  description: string;
  noCharge: boolean;
  totalAmount: number | null;
  createdAt: string;
  ticket: {
    id: string;
    ticketNumber: string;
    title: string;
    account: {
      id: string;
      name: string;
    };
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  billingRate?: {
    id: string;
    name: string;
    rate: number;
  } | null;
}

interface RecentTimeEntriesProps {
  userId?: string;
  limit?: number;
}

export function RecentTimeEntries({ userId, limit = 5 }: RecentTimeEntriesProps) {
  const router = useRouter();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimeEntries = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        params.append('limit', limit.toString());
        
        const response = await fetch(`/api/time-entries?${params}`);
        if (response.ok) {
          const data = await response.json();
          setTimeEntries(data.timeEntries || []);
        }
      } catch (error) {
        console.error('Error fetching time entries:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeEntries();
  }, [userId, limit]);

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
          <CardDescription>Your latest logged time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Time Entries</CardTitle>
        <CardDescription>Your latest logged time</CardDescription>
      </CardHeader>
      <CardContent>
        {timeEntries.length > 0 ? (
          <div className="space-y-4">
            {timeEntries.map((entry) => (
              <div 
                key={entry.id} 
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/tickets/${entry.ticket.id}`)}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {entry.ticket.ticketNumber}
                    </Badge>
                    <span className="text-sm font-medium truncate max-w-[300px]">
                      {entry.ticket.title}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {entry.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatMinutesToHours(entry.minutes)}
                    </div>
                    {entry.billingRate && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${entry.totalAmount?.toFixed(2) || '0.00'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {entry.noCharge && (
                    <Badge variant="secondary" className="text-xs">
                      No Charge
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {entry.ticket.account.name}
                  </span>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                router.push("/time");
              }}
            >
              View All Time Entries
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No time entries yet</h3>
            <p className="text-sm text-muted-foreground">Start tracking your time on tickets.</p>
            <Button 
              className="mt-4"
              onClick={() => router.push("/time")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Log Time Entry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}