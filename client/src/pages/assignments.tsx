import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { AssignmentWithDetails } from "@shared/schema";
import {
  CheckSquare,
  Calendar,
  Clock,
  Building2,
  User,
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
  DollarSign,
} from "lucide-react";

function AssignmentCard({
  assignment,
  onCheckIn,
  onCheckOut,
  onApprove,
  isWorker,
  isPending,
}: {
  assignment: AssignmentWithDetails;
  onCheckIn?: (id: string) => void;
  onCheckOut?: (id: string) => void;
  onApprove?: (id: string) => void;
  isWorker: boolean;
  isPending: boolean;
}) {
  const getStatusBadge = () => {
    if (assignment.approved) {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Approved</Badge>;
    }
    if (assignment.checkOut) {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Completed</Badge>;
    }
    if (assignment.checkIn) {
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30">In Progress</Badge>;
    }
    return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Upcoming</Badge>;
  };

  const getPayoutBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-xs">Payout Pending</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">Paid</Badge>;
      default:
        return null;
    }
  };

  const now = new Date();
  const shiftStart = new Date(assignment.shift?.startTime ?? now);
  const shiftEnd = new Date(assignment.shift?.endTime ?? now);
  const canCheckIn = !assignment.checkIn && now >= new Date(shiftStart.getTime() - 15 * 60000);
  const canCheckOut = assignment.checkIn && !assignment.checkOut;
  const canApprove = assignment.checkOut && !assignment.approved;

  return (
    <Card className="hover-elevate transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-base truncate">{assignment.shift?.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 text-xs">
              <Building2 className="h-3 w-3" />
              {isWorker ? "Your assignment" : `${assignment.worker?.firstName} ${assignment.worker?.lastName}`}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(shiftStart, "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(shiftStart, "h:mm a")} - {format(shiftEnd, "h:mm a")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>${assignment.shift?.payRate}/hr</span>
          </div>
          <div>
            {getPayoutBadge(assignment.payoutStatus)}
          </div>
        </div>

        {(assignment.checkIn || assignment.checkOut) && (
          <div className="flex items-center gap-4 p-3 rounded-md bg-muted/50 text-sm">
            {assignment.checkIn && (
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4 text-green-500" />
                <span>In: {format(new Date(assignment.checkIn), "h:mm a")}</span>
              </div>
            )}
            {assignment.checkOut && (
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4 text-blue-500" />
                <span>Out: {format(new Date(assignment.checkOut), "h:mm a")}</span>
              </div>
            )}
          </div>
        )}

        {!isWorker && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {assignment.worker?.firstName?.[0]}{assignment.worker?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {assignment.worker?.firstName} {assignment.worker?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {assignment.worker?.email}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          {isWorker && canCheckIn && (
            <Button
              size="sm"
              onClick={() => onCheckIn?.(assignment.id)}
              disabled={isPending}
              data-testid={`button-checkin-${assignment.id}`}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <LogIn className="h-4 w-4 mr-1" />
              Check In
            </Button>
          )}
          {isWorker && canCheckOut && (
            <Button
              size="sm"
              onClick={() => onCheckOut?.(assignment.id)}
              disabled={isPending}
              data-testid={`button-checkout-${assignment.id}`}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <LogOut className="h-4 w-4 mr-1" />
              Check Out
            </Button>
          )}
          {!isWorker && canApprove && (
            <Button
              size="sm"
              onClick={() => onApprove?.(assignment.id)}
              disabled={isPending}
              data-testid={`button-approve-${assignment.id}`}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve Completion
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: assignments, isLoading } = useQuery<AssignmentWithDetails[]>({
    queryKey: ["/api/assignments"],
    queryFn: async () => {
      const res = await fetch("/api/assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/assignments/${assignmentId}/checkin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to check in");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({ title: "Checked in successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to check in", description: error.message, variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/assignments/${assignmentId}/checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to check out");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({ title: "Checked out successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to check out", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/assignments/${assignmentId}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to approve");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ title: "Assignment approved and shift completed!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    },
  });

  const isWorker = user?.role === "WORKER";
  const isPending = checkInMutation.isPending || checkOutMutation.isPending || approveMutation.isPending;

  const upcomingAssignments = assignments?.filter((a) => !a.checkIn) ?? [];
  const activeAssignments = assignments?.filter((a) => a.checkIn && !a.checkOut) ?? [];
  const completedAssignments = assignments?.filter((a) => a.checkOut) ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-assignments-title">
            {isWorker ? "My Assignments" : "Manage Assignments"}
          </h1>
          <p className="text-muted-foreground">
            {isWorker ? "Track your scheduled shifts and check in/out" : "Monitor worker assignments and approve completions"}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : assignments?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No assignments yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {isWorker
                  ? "Your assigned shifts will appear here once your applications are accepted."
                  : "Worker assignments will appear here once shifts are filled."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeAssignments.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                    {activeAssignments.length}
                  </Badge>
                  In Progress
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onCheckOut={(id) => checkOutMutation.mutate(id)}
                      isWorker={isWorker}
                      isPending={isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {upcomingAssignments.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    {upcomingAssignments.length}
                  </Badge>
                  Upcoming
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onCheckIn={(id) => checkInMutation.mutate(id)}
                      isWorker={isWorker}
                      isPending={isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {completedAssignments.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Completed</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {completedAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onApprove={(id) => approveMutation.mutate(id)}
                      isWorker={isWorker}
                      isPending={isPending}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
