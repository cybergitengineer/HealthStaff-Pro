import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ApplicationWithDetails } from "@shared/schema";
import {
  ClipboardList,
  Calendar,
  Clock,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
  Award,
} from "lucide-react";

function ApplicationCard({
  application,
  onAccept,
  onReject,
  onWithdraw,
  isWorker,
  isPending,
}: {
  application: ApplicationWithDetails;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onWithdraw?: (id: string) => void;
  isWorker: boolean;
  isPending: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "withdrawn":
        return <Badge variant="outline">Withdrawn</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card className="hover-elevate transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="text-base truncate">{application.shift?.title}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <Building2 className="h-3 w-3" />
                {isWorker ? "Applied" : `${application.worker?.firstName} ${application.worker?.lastName}`}
              </CardDescription>
            </div>
            {getStatusBadge(application.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(application.shift?.startTime ?? new Date()), "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(application.appliedAt), "MMM d, h:mm a")}</span>
            </div>
          </div>

          {!isWorker && application.workerProfile && (
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {application.worker?.firstName?.[0]}{application.worker?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {application.worker?.firstName} {application.worker?.lastName}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs h-5">
                    {application.workerProfile.licenseType}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    {application.workerProfile.reliabilityScore}%
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setShowDetails(true)} data-testid={`button-view-application-${application.id}`}>
              View Details
            </Button>
            {application.status === "pending" && (
              <div className="flex gap-2">
                {isWorker ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onWithdraw?.(application.id)}
                    disabled={isPending}
                    data-testid={`button-withdraw-${application.id}`}
                  >
                    Withdraw
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReject?.(application.id)}
                      disabled={isPending}
                      data-testid={`button-reject-${application.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onAccept?.(application.id)}
                      disabled={isPending}
                      data-testid={`button-accept-${application.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              {isWorker ? "Your application for this shift" : "Review worker application"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Shift Information</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Title:</strong> {application.shift?.title}</p>
                <p><strong>Date:</strong> {format(new Date(application.shift?.startTime ?? new Date()), "EEEE, MMMM d, yyyy")}</p>
                <p><strong>Time:</strong> {format(new Date(application.shift?.startTime ?? new Date()), "h:mm a")} - {format(new Date(application.shift?.endTime ?? new Date()), "h:mm a")}</p>
                <p><strong>Pay Rate:</strong> ${application.shift?.payRate}/hr</p>
              </div>
            </div>

            {!isWorker && application.workerProfile && (
              <div>
                <h4 className="font-medium mb-2">Worker Information</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {application.worker?.firstName} {application.worker?.lastName}</p>
                  <p><strong>License:</strong> {application.workerProfile.licenseType} #{application.workerProfile.licenseNumber}</p>
                  <p><strong>Reliability Score:</strong> {application.workerProfile.reliabilityScore}%</p>
                  {application.workerProfile.verified && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                      <Award className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {application.message && (
              <div>
                <h4 className="font-medium mb-2">Message</h4>
                <p className="text-sm text-muted-foreground">{application.message}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: applications, isLoading } = useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch applications");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update application");
      }
      return res.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: status === "accepted" ? "Application accepted" : status === "rejected" ? "Application rejected" : "Application withdrawn",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const isWorker = user?.role === "WORKER";

  const pendingApplications = applications?.filter((a) => a.status === "pending") ?? [];
  const otherApplications = applications?.filter((a) => a.status !== "pending") ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-applications-title">
            {isWorker ? "My Applications" : "Review Applications"}
          </h1>
          <p className="text-muted-foreground">
            {isWorker ? "Track the status of your shift applications" : "Review and manage worker applications"}
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
        ) : applications?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No applications yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {isWorker
                  ? "Apply to available shifts to see your applications here."
                  : "Applications from workers will appear here."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingApplications.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    {pendingApplications.length}
                  </Badge>
                  Pending Review
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingApplications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      onAccept={(id) => updateMutation.mutate({ id, status: "accepted" })}
                      onReject={(id) => updateMutation.mutate({ id, status: "rejected" })}
                      onWithdraw={(id) => updateMutation.mutate({ id, status: "withdrawn" })}
                      isWorker={isWorker}
                      isPending={updateMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {otherApplications.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Previous Applications</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {otherApplications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      isWorker={isWorker}
                      isPending={updateMutation.isPending}
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
