import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Stethoscope, Shield, Building2, User } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast({
        title: "Welcome back!",
        description: "You have been logged in successfully.",
      });
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const demoUsers = [
    { email: "admin@example.com", password: "admin123", role: "Super Admin", icon: Shield },
    { email: "facility@example.com", password: "facility123", role: "Facility Admin", icon: Building2 },
    { email: "worker@example.com", password: "worker123", role: "Healthcare Worker", icon: User },
  ];

  const handleDemoLogin = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Stethoscope className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">HealthStaff Pro</h1>
          <p className="text-muted-foreground text-center">
            Multi-tenant healthcare staffing platform
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Demo Accounts</CardTitle>
            <CardDescription className="text-xs">
              Click to autofill credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {demoUsers.map((user) => (
              <button
                key={user.email}
                onClick={() => handleDemoLogin(user.email, user.password)}
                className="w-full flex items-center gap-3 p-3 rounded-md text-left hover-elevate active-elevate-2 bg-muted/50 transition-colors"
                data-testid={`button-demo-${user.role.toLowerCase().replace(" ", "-")}`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
                  <user.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.role}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
