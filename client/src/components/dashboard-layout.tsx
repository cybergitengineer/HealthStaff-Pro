import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Stethoscope,
  LayoutDashboard,
  Calendar,
  Users,
  Building2,
  ClipboardList,
  Settings,
  LogOut,
  UserCircle,
  Clock,
  CheckSquare,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case "SUPER_ADMIN":
        return [
          { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
          { title: "Tenants", url: "/tenants", icon: Building2 },
          { title: "Workers", url: "/workers", icon: Users },
          { title: "All Shifts", url: "/shifts", icon: Calendar },
          { title: "Assignments", url: "/assignments", icon: CheckSquare },
        ];
      case "FACILITY_ADMIN":
        return [
          { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
          { title: "Shifts", url: "/shifts", icon: Calendar },
          { title: "Applications", url: "/applications", icon: ClipboardList },
          { title: "Assignments", url: "/assignments", icon: CheckSquare },
        ];
      case "WORKER":
        return [
          { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
          { title: "Available Shifts", url: "/shifts", icon: Calendar },
          { title: "My Applications", url: "/applications", icon: ClipboardList },
          { title: "My Assignments", url: "/assignments", icon: Clock },
          { title: "Profile", url: "/profile", icon: UserCircle },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getRoleBadgeVariant = () => {
    switch (user?.role) {
      case "SUPER_ADMIN":
        return "default";
      case "FACILITY_ADMIN":
        return "secondary";
      case "WORKER":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case "SUPER_ADMIN":
        return "Admin";
      case "FACILITY_ADMIN":
        return "Facility";
      case "WORKER":
        return "Worker";
      default:
        return "User";
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">HealthStaff Pro</span>
                <span className="text-xs text-muted-foreground">Staffing Platform</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                      >
                        <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <Badge variant={getRoleBadgeVariant()} className="text-xs h-5">
                  {getRoleLabel()}
                </Badge>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user?.firstName} {user?.lastName}</span>
                      <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer" data-testid="menu-item-profile">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive cursor-pointer"
                    data-testid="menu-item-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
