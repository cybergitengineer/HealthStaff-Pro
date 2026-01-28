import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { UserWithProfile } from "@shared/schema";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Star,
  Award,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

function WorkerCard({
  worker,
  onVerify,
  onSuspend,
  isPending,
}: {
  worker: UserWithProfile;
  onVerify?: (id: string) => void;
  onSuspend?: (id: string) => void;
  isPending: boolean;
}) {
  const getStatusBadge = () => {
    if (worker.status === "suspended") {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (worker.workerProfile?.verified) {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Verified</Badge>;
    }
    return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending Verification</Badge>;
  };

  return (
    <Card className="hover-elevate transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary">
              {worker.firstName?.[0]}{worker.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base truncate">
                {worker.firstName} {worker.lastName}
              </CardTitle>
              {getStatusBadge()}
            </div>
            <CardDescription className="flex items-center gap-1 text-xs">
              <Mail className="h-3 w-3" />
              {worker.email}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {worker.workerProfile && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {worker.workerProfile.licenseType}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{worker.workerProfile.reliabilityScore}% reliability</span>
            </div>
            {worker.workerProfile.licenseExpiry && (
              <div className="col-span-2 flex items-center gap-2 text-muted-foreground text-xs">
                <Calendar className="h-3 w-3" />
                <span>License expires: {format(new Date(worker.workerProfile.licenseExpiry), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        )}

        {worker.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{worker.phone}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" data-testid={`button-view-worker-${worker.id}`}>
            View Profile
          </Button>
          {worker.workerProfile && !worker.workerProfile.verified && worker.status !== "suspended" && (
            <Button
              size="sm"
              onClick={() => onVerify?.(worker.id)}
              disabled={isPending}
              data-testid={`button-verify-worker-${worker.id}`}
            >
              <Award className="h-4 w-4 mr-1" />
              Verify
            </Button>
          )}
          {worker.status !== "suspended" && worker.workerProfile?.verified && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSuspend?.(worker.id)}
              disabled={isPending}
              data-testid={`button-suspend-worker-${worker.id}`}
            >
              Suspend
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkersPage() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: workers, isLoading } = useQuery<UserWithProfile[]>({
    queryKey: ["/api/workers"],
    queryFn: async () => {
      const res = await fetch("/api/workers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch workers");
      return res.json();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (workerId: string) => {
      const res = await fetch(`/api/workers/${workerId}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to verify worker");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      toast({ title: "Worker verified successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to verify", description: error.message, variant: "destructive" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (workerId: string) => {
      const res = await fetch(`/api/workers/${workerId}/suspend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to suspend worker");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      toast({ title: "Worker suspended" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to suspend", description: error.message, variant: "destructive" });
    },
  });

  const filteredWorkers = workers?.filter((worker) =>
    `${worker.firstName} ${worker.lastName} ${worker.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingWorkers = filteredWorkers?.filter((w) => !w.workerProfile?.verified && w.status !== "suspended") ?? [];
  const verifiedWorkers = filteredWorkers?.filter((w) => w.workerProfile?.verified && w.status !== "suspended") ?? [];

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">Access Denied</h3>
            <p className="text-sm text-muted-foreground">Only administrators can access this page.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-workers-title">
            Healthcare Workers
          </h1>
          <p className="text-muted-foreground">Manage and verify healthcare workers on the platform</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-workers"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredWorkers?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No workers found</h3>
              <p className="text-sm text-muted-foreground">Workers will appear here when they register.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingWorkers.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    {pendingWorkers.length}
                  </Badge>
                  Pending Verification
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingWorkers.map((worker) => (
                    <WorkerCard
                      key={worker.id}
                      worker={worker}
                      onVerify={(id) => verifyMutation.mutate(id)}
                      onSuspend={(id) => suspendMutation.mutate(id)}
                      isPending={verifyMutation.isPending || suspendMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {verifiedWorkers.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Verified Workers</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {verifiedWorkers.map((worker) => (
                    <WorkerCard
                      key={worker.id}
                      worker={worker}
                      onSuspend={(id) => suspendMutation.mutate(id)}
                      isPending={suspendMutation.isPending}
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
