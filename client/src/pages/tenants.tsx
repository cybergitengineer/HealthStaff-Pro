import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Tenant } from "@shared/schema";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Settings,
  Users,
  Calendar,
} from "lucide-react";

function TenantCard({
  tenant,
  onApprove,
  onSuspend,
  isPending,
}: {
  tenant: Tenant;
  onApprove?: (id: string) => void;
  onSuspend?: (id: string) => void;
  isPending: boolean;
}) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending Approval</Badge>;
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Approved</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "LTC":
        return <Badge variant="outline">Long Term Care</Badge>;
      case "Homecare":
        return <Badge variant="outline">Homecare</Badge>;
      case "Clinic":
        return <Badge variant="outline">Clinic</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card className="hover-elevate transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{tenant.name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {getTypeBadge(tenant.type)}
            </CardDescription>
          </div>
          {getStatusBadge(tenant.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Settings className="h-4 w-4" />
            <span>{(tenant.pricing as any)?.markup ?? 15}% markup</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{(tenant.rules as any)?.cancellationWindow ?? 24}h cancel window</span>
          </div>
        </div>

        {tenant.status === "pending" && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onSuspend?.(tenant.id)}
              disabled={isPending}
              data-testid={`button-reject-tenant-${tenant.id}`}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onApprove?.(tenant.id)}
              disabled={isPending}
              data-testid={`button-approve-tenant-${tenant.id}`}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </div>
        )}

        {tenant.status === "approved" && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" data-testid={`button-view-tenant-${tenant.id}`}>
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSuspend?.(tenant.id)}
              disabled={isPending}
              data-testid={`button-suspend-tenant-${tenant.id}`}
            >
              Suspend
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateTenantDialog() {
  const [open, setOpen] = useState(false);
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    type: "LTC",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create tenant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Facility created successfully" });
      setOpen(false);
      setFormData({ name: "", type: "LTC" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create facility", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-tenant">
          <Plus className="h-4 w-4 mr-2" />
          Add Facility
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Facility</DialogTitle>
          <DialogDescription>Register a new healthcare facility on the platform</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Facility Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sunrise Senior Care"
              required
              data-testid="input-tenant-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Facility Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger data-testid="select-tenant-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LTC">Long Term Care (LTC)</SelectItem>
                <SelectItem value="Homecare">Homecare Agency</SelectItem>
                <SelectItem value="Clinic">Clinic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-tenant">
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Facility
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TenantsPage() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
    queryFn: async () => {
      const res = await fetch("/api/tenants", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch tenants");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/tenants/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update tenant");
      }
      return res.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({
        title: status === "approved" ? "Facility approved" : "Facility suspended",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const filteredTenants = tenants?.filter((tenant) =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingTenants = filteredTenants?.filter((t) => t.status === "pending") ?? [];
  const approvedTenants = filteredTenants?.filter((t) => t.status === "approved") ?? [];

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-tenants-title">
              Facilities
            </h1>
            <p className="text-muted-foreground">Manage healthcare facilities on the platform</p>
          </div>
          <CreateTenantDialog />
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search facilities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-tenants"
          />
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
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTenants?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No facilities found</h3>
              <p className="text-sm text-muted-foreground">Add your first facility to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingTenants.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    {pendingTenants.length}
                  </Badge>
                  Pending Approval
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingTenants.map((tenant) => (
                    <TenantCard
                      key={tenant.id}
                      tenant={tenant}
                      onApprove={(id) => updateMutation.mutate({ id, status: "approved" })}
                      onSuspend={(id) => updateMutation.mutate({ id, status: "suspended" })}
                      isPending={updateMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {approvedTenants.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Active Facilities</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {approvedTenants.map((tenant) => (
                    <TenantCard
                      key={tenant.id}
                      tenant={tenant}
                      onSuspend={(id) => updateMutation.mutate({ id, status: "suspended" })}
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
