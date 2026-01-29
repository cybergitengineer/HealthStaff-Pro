import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Calendar,
  Users,
  Building2,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  DollarSign,
} from "lucide-react";

interface DashboardStats {
  totalShifts: number;
  openShifts: number;
  filledShifts: number;
  completedShifts: number;
  totalWorkers?: number;
  verifiedWorkers?: number;
  totalTenants?: number;
  approvedTenants?: number;
  pendingApplications?: number;
  myApplications?: number;
  myAssignments?: number;
  reliabilityScore?: number;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: typeof Calendar;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <TrendingUp
              className={`h-4 w-4 mb-1 ${
                trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500 rotate-180" : "text-muted-foreground"
              }`}
            />
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function AdminDashboard() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const [, setLocation] = useLocation();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-muted-foreground">Here's what's happening across your platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value={stats?.totalTenants ?? 0}
          description={`${stats?.approvedTenants ?? 0} approved`}
          icon={Building2}
        />
        <StatCard
          title="Healthcare Workers"
          value={stats?.totalWorkers ?? 0}
          description={`${stats?.verifiedWorkers ?? 0} verified`}
          icon={Users}
        />
        <StatCard
          title="Open Shifts"
          value={stats?.openShifts ?? 0}
          description="Available for workers"
          icon={Calendar}
        />
        <StatCard
          title="Filled Shifts"
          value={stats?.filledShifts ?? 0}
          description="Assigned to workers"
          icon={CheckCircle2}
          trend="up"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "New worker registration", time: "2 min ago", type: "info" },
                { action: "Shift completed at Sunrise LTC", time: "15 min ago", type: "success" },
                { action: "New tenant application", time: "1 hour ago", type: "warning" },
                { action: "Worker verification approved", time: "2 hours ago", type: "success" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.type === "success"
                        ? "bg-green-500"
                        : item.type === "warning"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <button 
              onClick={() => setLocation("/tenants")}
              className="w-full flex items-center gap-3 p-3 rounded-md text-left hover-elevate active-elevate-2 bg-muted/50"
              data-testid="button-quick-tenants"
            >
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm">Review tenant applications</span>
            </button>
            <button 
              onClick={() => setLocation("/workers")}
              className="w-full flex items-center gap-3 p-3 rounded-md text-left hover-elevate active-elevate-2 bg-muted/50"
              data-testid="button-quick-workers"
            >
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm">Verify worker licenses</span>
            </button>
            <button 
              onClick={() => setLocation("/assignments")}
              className="w-full flex items-center gap-3 p-3 rounded-md text-left hover-elevate active-elevate-2 bg-muted/50"
              data-testid="button-quick-assignments"
            >
              <AlertCircle className="h-4 w-4 text-primary" />
              <span className="text-sm">Handle disputes</span>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FacilityDashboard() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-muted-foreground">
          Manage shifts and staffing for {user?.tenant?.name ?? "your facility"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open Shifts"
          value={stats?.openShifts ?? 0}
          description="Waiting for applicants"
          icon={Calendar}
        />
        <StatCard
          title="Pending Applications"
          value={stats?.pendingApplications ?? 0}
          description="Review applicants"
          icon={ClipboardList}
        />
        <StatCard
          title="Filled Shifts"
          value={stats?.filledShifts ?? 0}
          description="Workers assigned"
          icon={CheckCircle2}
          trend="up"
        />
        <StatCard
          title="Completed This Month"
          value={stats?.completedShifts ?? 0}
          description="Successfully fulfilled"
          icon={Clock}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Shifts</CardTitle>
            <CardDescription>Shifts scheduled for the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              No upcoming shifts. Create a new shift to get started.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Workers who applied recently</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              No pending applications at the moment.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WorkerDashboard() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const isVerified = user?.workerProfile?.verified;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-muted-foreground">Find shifts and manage your schedule</p>
        </div>
        {!isVerified && (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Profile pending verification
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Available Shifts"
          value={stats?.openShifts ?? 0}
          description="Matching your profile"
          icon={Calendar}
        />
        <StatCard
          title="My Applications"
          value={stats?.myApplications ?? 0}
          description="Pending review"
          icon={ClipboardList}
        />
        <StatCard
          title="Upcoming Shifts"
          value={stats?.myAssignments ?? 0}
          description="Assigned to you"
          icon={Clock}
        />
        <StatCard
          title="Reliability Score"
          value={`${stats?.reliabilityScore ?? 100}%`}
          description="Based on performance"
          icon={TrendingUp}
          trend={stats?.reliabilityScore && stats.reliabilityScore >= 90 ? "up" : "neutral"}
        />
      </div>

      {!isVerified && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Complete Your Profile
            </CardTitle>
            <CardDescription>
              Your profile is pending verification. Complete your profile to see available shifts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please ensure your license information is up to date and wait for admin verification.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recommended Shifts</CardTitle>
            <CardDescription>Based on your availability and skills</CardDescription>
          </CardHeader>
          <CardContent>
            {isVerified ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No matching shifts available right now.
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                Complete profile verification to see available shifts.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Assignments</CardTitle>
            <CardDescription>Your scheduled shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              No upcoming assignments scheduled.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      {user?.role === "SUPER_ADMIN" && <AdminDashboard />}
      {user?.role === "FACILITY_ADMIN" && <FacilityDashboard />}
      {user?.role === "WORKER" && <WorkerDashboard />}
    </DashboardLayout>
  );
}
