import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { format } from "date-fns";
import type { ShiftWithDetails, Tenant } from "@shared/schema";
import {
  Plus,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Building2,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function ShiftCard({ shift, onApply, isWorker }: { shift: ShiftWithDetails; onApply?: (id: string) => void; isWorker: boolean }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Open</Badge>;
      case "offered":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Offered</Badge>;
      case "filled":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30">Filled</Badge>;
      case "completed":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/30">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return <Badge variant="destructive" className="text-xs">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30 text-xs">High Priority</Badge>;
      case "normal":
        return null;
      case "low":
        return <Badge variant="outline" className="text-xs">Low Priority</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="hover-elevate transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{shift.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 text-xs">
              <Building2 className="h-3 w-3" />
              {shift.tenant?.name ?? "Unknown Facility"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {getUrgencyBadge(shift.urgency)}
            {getStatusBadge(shift.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(shift.startTime), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(shift.startTime), "h:mm a")} - {format(new Date(shift.endTime), "h:mm a")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>${shift.payRate}/hr</span>
          </div>
          {shift.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{shift.location}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t">
          <Badge variant="outline" className="text-xs">
            {shift.requiredLicense}
          </Badge>
          {isWorker && shift.status === "open" && onApply && (
            <Button size="sm" onClick={() => onApply(shift.id)} data-testid={`button-apply-shift-${shift.id}`}>
              Apply Now
            </Button>
          )}
          {!isWorker && (
            <span className="text-xs text-muted-foreground">
              {shift.applicationsCount ?? 0} applications
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateShiftDialog({ tenants }: { tenants: Tenant[] }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requiredLicense: "RN",
    startTime: "",
    endTime: "",
    payRate: "",
    urgency: "normal",
    location: "",
    notes: "",
    tenantId: user?.tenantId ?? "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          payRate: parseInt(data.payRate),
          startTime: new Date(data.startTime).toISOString(),
          endTime: new Date(data.endTime).toISOString(),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create shift");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ title: "Shift created successfully" });
      setOpen(false);
      setFormData({
        title: "",
        description: "",
        requiredLicense: "RN",
        startTime: "",
        endTime: "",
        payRate: "",
        urgency: "normal",
        location: "",
        notes: "",
        tenantId: user?.tenantId ?? "",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create shift", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-shift">
          <Plus className="h-4 w-4 mr-2" />
          Create Shift
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
          <DialogDescription>Post a new shift for healthcare workers to apply</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Shift Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Night Shift RN"
              required
              data-testid="input-shift-title"
            />
          </div>

          {user?.role === "SUPER_ADMIN" && (
            <div className="space-y-2">
              <Label htmlFor="tenantId">Facility</Label>
              <Select
                value={formData.tenantId}
                onValueChange={(value) => setFormData({ ...formData, tenantId: value })}
              >
                <SelectTrigger data-testid="select-tenant">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requiredLicense">Required License</Label>
              <Select
                value={formData.requiredLicense}
                onValueChange={(value) => setFormData({ ...formData, requiredLicense: value })}
              >
                <SelectTrigger data-testid="select-license">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RN">RN - Registered Nurse</SelectItem>
                  <SelectItem value="LPN">LPN - Licensed Practical Nurse</SelectItem>
                  <SelectItem value="CNA">CNA - Certified Nursing Assistant</SelectItem>
                  <SelectItem value="HCA">HCA - Health Care Aide</SelectItem>
                  <SelectItem value="PSW">PSW - Personal Support Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) => setFormData({ ...formData, urgency: value })}
              >
                <SelectTrigger data-testid="select-urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
                data-testid="input-start-time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
                data-testid="input-end-time"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payRate">Pay Rate ($/hr)</Label>
              <Input
                id="payRate"
                type="number"
                min="1"
                value={formData.payRate}
                onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
                placeholder="35"
                required
                data-testid="input-pay-rate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Floor 2, Unit A"
                data-testid="input-location"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the shift responsibilities..."
              rows={3}
              data-testid="input-description"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-shift">
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Shift
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ShiftsPage() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: shifts, isLoading } = useQuery<ShiftWithDetails[]>({
    queryKey: ["/api/shifts"],
    queryFn: async () => {
      const res = await fetch("/api/shifts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch shifts");
      return res.json();
    },
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
    queryFn: async () => {
      const res = await fetch("/api/tenants", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: user?.role === "SUPER_ADMIN",
  });

  const applyMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shiftId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to apply");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({ title: "Application submitted!", description: "The facility will review your application." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to apply", description: error.message, variant: "destructive" });
    },
  });

  const filteredShifts = shifts?.filter((shift) => {
    const matchesSearch = shift.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || shift.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isWorker = user?.role === "WORKER";
  const canCreateShift = user?.role === "FACILITY_ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-shifts-title">
              {isWorker ? "Available Shifts" : "Manage Shifts"}
            </h1>
            <p className="text-muted-foreground">
              {isWorker ? "Browse and apply for shifts matching your profile" : "View and manage shift postings"}
            </p>
          </div>
          {canCreateShift && <CreateShiftDialog tenants={tenants ?? []} />}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shifts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-shifts"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="offered">Offered</SelectItem>
              <SelectItem value="filled">Filled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
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
        ) : filteredShifts?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No shifts found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {isWorker
                  ? "No shifts match your criteria. Check back later for new opportunities."
                  : "Create your first shift to start receiving applications."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredShifts?.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                onApply={(id) => applyMutation.mutate(id)}
                isWorker={isWorker}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
