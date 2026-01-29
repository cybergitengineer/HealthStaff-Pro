import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { UserWithProfile } from "@shared/schema";
import {
  Users,
  Search,
  Plus,
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
  onViewProfile,
  isPending,
}: {
  worker: UserWithProfile;
  onVerify?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onViewProfile?: (worker: UserWithProfile) => void;
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
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewProfile?.(worker)}
            data-testid={`button-view-profile-${worker.id}`}
          >
            View Profile
          </Button>
          {worker.workerProfile && !worker.workerProfile.verified && worker.status !== "suspended" && (
            <Button size="sm" onClick={() => onVerify?.(worker.id)} disabled={isPending}>
              <Award className="h-4 w-4 mr-1" /> Verify
            </Button>
          )}
          {worker.status !== "suspended" && worker.workerProfile?.verified && (
            <Button variant="outline" size="sm" onClick={() => onSuspend?.(worker.id)} disabled={isPending}>
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<UserWithProfile | null>(null);

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

  const createMutation = useMutation({
    mutationFn: async (newWorker: any) => {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newWorker),
      });
      if (!res.ok) throw new Error("Failed to create worker");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      toast({ title: "Worker created successfully" });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (workerId: string) => {
      const res = await fetch(`/api/workers/${workerId}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/workers"] }),
  });

  const suspendMutation = useMutation({
    mutationFn: async (workerId: string) => {
      const res = await fetch(`/api/workers/${workerId}/suspend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      toast({ title: "Worker suspended" });
    },
  });

  const handleCreateWorker = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    createMutation.mutate(data);
  };

  // UPDATED FILTERS: Now we keep suspended workers in the lists so they don't vanish
  const filteredWorkers = workers?.filter((worker) =>
    `${worker.firstName} ${worker.lastName} ${worker.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingWorkers = filteredWorkers?.filter((w) => !w.workerProfile?.verified) ?? [];
  const verifiedWorkers = filteredWorkers?.filter((w) => w.workerProfile?.verified) ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Healthcare Workers</h1>
            <p className="text-muted-foreground">Manage and verify healthcare workers</p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Worker
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Worker</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateWorker} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input name="firstName" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input name="lastName" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label>License (RN, LPN, etc.)</Label>
                  <Input name="licenseType" required />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Worker"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Worker Lists (Pending & Verified) render here */}
        <div className="space-y-6">
          {pendingWorkers.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Pending Verification</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingWorkers.map((worker) => (
                  <WorkerCard 
                    key={worker.id} 
                    worker={worker} 
                    onVerify={(id) => verifyMutation.mutate(id)}
                    onSuspend={(id) => suspendMutation.mutate(id)}
                    onViewProfile={setSelectedWorker}
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
                    onViewProfile={setSelectedWorker}
                    isPending={suspendMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Worker Profile Dialog */}
      <Dialog open={!!selectedWorker} onOpenChange={(open) => !open && setSelectedWorker(null)}>
        <DialogContent className="max-w-lg" aria-describedby="worker-profile-description">
          <DialogHeader>
            <DialogTitle>Worker Profile</DialogTitle>
            <p id="worker-profile-description" className="sr-only">Detailed profile information for the selected healthcare worker</p>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {selectedWorker.firstName?.[0]}{selectedWorker.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">
                    {selectedWorker.firstName} {selectedWorker.lastName}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {selectedWorker.email}
                  </div>
                  {selectedWorker.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {selectedWorker.phone}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  {selectedWorker.status === "suspended" ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : selectedWorker.workerProfile?.verified ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Verified</Badge>
                  ) : (
                    <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">License Type</p>
                  <Badge variant="outline">{selectedWorker.workerProfile?.licenseType || "N/A"}</Badge>
                </div>
              </div>

              {selectedWorker.workerProfile && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Reliability Score</p>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">{selectedWorker.workerProfile.reliabilityScore ?? 100}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">License Number</p>
                    <span className="font-semibold">{selectedWorker.workerProfile.licenseNumber || "Not provided"}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">License Expiry</p>
                    <span className="font-semibold">{format(new Date(selectedWorker.workerProfile.licenseExpiry), "MMM d, yyyy")}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Specialties</p>
                    <span className="font-semibold text-sm">{selectedWorker.workerProfile.specialties?.join(", ") || "General"}</span>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t space-y-1">
                <p className="text-xs text-muted-foreground">Member Since</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedWorker.createdAt), "MMMM d, yyyy")}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {selectedWorker.workerProfile && !selectedWorker.workerProfile.verified && selectedWorker.status !== "suspended" && (
                  <Button 
                    onClick={() => {
                      verifyMutation.mutate(selectedWorker.id);
                      setSelectedWorker(null);
                    }}
                    disabled={verifyMutation.isPending}
                    data-testid="button-verify-worker"
                  >
                    <Award className="h-4 w-4 mr-1" /> Verify Worker
                  </Button>
                )}
                {selectedWorker.status !== "suspended" && selectedWorker.workerProfile?.verified && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      suspendMutation.mutate(selectedWorker.id);
                      setSelectedWorker(null);
                    }}
                    disabled={suspendMutation.isPending}
                    data-testid="button-suspend-worker"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Suspend Worker
                  </Button>
                )}
                {selectedWorker.status === "suspended" && (
                  <Button 
                    onClick={() => {
                      verifyMutation.mutate(selectedWorker.id);
                      setSelectedWorker(null);
                    }}
                    disabled={verifyMutation.isPending}
                    data-testid="button-reactivate-worker"
                  >
                    Reactivate Worker
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}