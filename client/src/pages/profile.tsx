import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const cleanPhone = (user?.phone ?? "").replace(/[^\d+]/g, "");
  let displayPhone = cleanPhone;
  let displayCode = "";
  const phoneMatch = cleanPhone.match(/^(\+\d{1,3})(\d+)$/);
  if (phoneMatch) {
    displayCode = phoneMatch[1];
    displayPhone = phoneMatch[2];
  } else {
    displayPhone = cleanPhone.replace(/^\+/, "");
  }

  const [formData, setFormData] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: displayPhone,
    countryCode: displayCode,
    // (as any) clears the red property error in your diagnostics
    licenseType: (user?.workerProfile as any)?.licenseType ?? "RN",
    licenseNumber: (user?.workerProfile as any)?.licenseNumber ?? "",
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
          // Re-combine for database storage
          phone: `${data.countryCode || ""}${data.phone}`.replace(
            /[^\d+]/g,
            "",
          ),
          licenseExpiry: data.licenseExpiry
            ? new Date(data.licenseExpiry).toISOString()
            : undefined,
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
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
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
          <h1 className="text-2xl font-bold tracking-tight">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account information
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Account</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold">
                {user?.firstName} {user?.lastName}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {user?.email}
              </p>
              <div className="flex flex-col gap-2 w-full">
                <Badge variant="secondary" className="justify-center">
                  <Shield className="h-3 w-3 mr-1" />
                  {user?.role === "WORKER" ? "Healthcare Worker" : "Admin"}
                </Badge>
                {isWorker &&
                  (isVerified ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30 justify-center">
                      <Award className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 justify-center">
                      <AlertCircle className="h-3 w-3 mr-1" /> Pending
                      Verification
                    </Badge>
                  ))}
              </div>
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
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-4 w-4 inline mr-2" /> Phone Number
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="countryCode"
                      className="w-24"
                      placeholder="+1"
                      value={formData.countryCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          countryCode: e.target.value,
                        })
                      }
                    />
                    <Input
                      id="phone"
                      type="tel"
                      className="flex-1"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                {isWorker && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="licenseType">License Type</Label>
                        <Select
                          value={formData.licenseType}
                          onValueChange={(v) =>
                            setFormData({ ...formData, licenseType: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RN">
                              RN - Registered Nurse
                            </SelectItem>
                            <SelectItem value="LPN">
                              LPN - Licensed Practical Nurse
                            </SelectItem>
                            <SelectItem value="CNA">
                              CNA - Certified Nursing Assistant
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="licenseNumber">License Number</Label>
                        <Input
                          id="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              licenseNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licenseExpiry">License Expiry Date</Label>
                      <Input
                        id="licenseExpiry"
                        type="date"
                        value={formData.licenseExpiry}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            licenseExpiry: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData({ ...formData, bio: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
