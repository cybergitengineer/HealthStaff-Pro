import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  User,
  Mail,
  Phone,
  Award,
  Star,
  Calendar,
  Shield,
  Loader2,
  Save,
  AlertCircle,
} from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
    licenseType: user?.workerProfile?.licenseType ?? "RN",
    licenseNumber: user?.workerProfile?.licenseNumber ?? "",
    licenseExpiry: user?.workerProfile?.licenseExpiry
      ? format(new Date(user.workerProfile.licenseExpiry), "yyyy-MM-dd")
      : "",
    bio: user?.workerProfile?.bio ?? "",
    availability: user?.workerProfile?.availability ?? {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      refreshUser();
      toast({ title: "Profile updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const toggleAvailability = (day: keyof typeof formData.availability) => {
    setFormData({
      ...formData,
      availability: {
        ...formData.availability,
        [day]: !formData.availability[day],
      },
    });
  };

  const isWorker = user?.role === "WORKER";
  const isVerified = user?.workerProfile?.verified;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-profile-title">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">Manage your account and profile information</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Account</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold">
                {user?.firstName} {user?.lastName}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">{user?.email}</p>
              
              <div className="flex flex-col gap-2 w-full">
                <Badge
                  variant={user?.role === "SUPER_ADMIN" ? "default" : "secondary"}
                  className="justify-center"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {user?.role === "SUPER_ADMIN"
                    ? "Super Admin"
                    : user?.role === "FACILITY_ADMIN"
                    ? "Facility Admin"
                    : "Healthcare Worker"}
                </Badge>
                
                {isWorker && (
                  <>
                    {isVerified ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/30 justify-center">
                        <Award className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 justify-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending Verification
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {isWorker && user?.workerProfile && (
                <div className="mt-4 pt-4 border-t w-full">
                  <div className="flex items-center justify-center gap-2 text-lg font-semibold">
                    <Star className="h-5 w-5 text-yellow-500" />
                    {user.workerProfile.reliabilityScore}%
                  </div>
                  <p className="text-xs text-muted-foreground">Reliability Score</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    data-testid="input-phone"
                  />
                </div>

                {isWorker && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="licenseType">License Type</Label>
                        <Select
                          value={formData.licenseType}
                          onValueChange={(value) => setFormData({ ...formData, licenseType: value })}
                        >
                          <SelectTrigger data-testid="select-license-type">
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
                        <Label htmlFor="licenseNumber">License Number</Label>
                        <Input
                          id="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                          placeholder="e.g., RN-123456"
                          data-testid="input-license-number"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="licenseExpiry">License Expiry Date</Label>
                      <Input
                        id="licenseExpiry"
                        type="date"
                        value={formData.licenseExpiry}
                        onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                        data-testid="input-license-expiry"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell facilities about your experience and skills..."
                        rows={3}
                        data-testid="input-bio"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Availability</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.entries(formData.availability).map(([day, available]) => (
                          <div
                            key={day}
                            className="flex items-center space-x-2 p-2 rounded-md bg-muted/50"
                          >
                            <Checkbox
                              id={day}
                              checked={available}
                              onCheckedChange={() => toggleAvailability(day as keyof typeof formData.availability)}
                              data-testid={`checkbox-${day}`}
                            />
                            <Label htmlFor={day} className="text-sm capitalize cursor-pointer">
                              {day.slice(0, 3)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4">
                  <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
