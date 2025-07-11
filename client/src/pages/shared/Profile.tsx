import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, User } from "lucide-react";
import Navbar from "@/components/Navbar";

const Profile = () => {
  const navigate = useNavigate();

  //Mock, should come from auth context probs
  const user = {
    name: "Jane Doe",
    email: "jane.doe@example.com",
    role: "Instructor",
    joinDate: new Date(2023, 0, 15).toLocaleDateString(),
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <Button
          variant="outline"
          className="mb-6 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          Back
        </Button>

        <div className="flex items-center mb-8 gap-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-full w-24 h-24 flex items-center justify-center">
            <User size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-gray-400">{user.email}</p>
            <p className="mt-1 text-[#00b7ff]">{user.role}</p>
          </div>
        </div>

        <Tabs defaultValue="account">
          <TabsList className="mb-6">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <Card className="bg-[#0d1224] border-gray-700">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Manage your personal information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Name</h3>
                    <p>{user.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Email</h3>
                    <p>{user.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">
                      User Type
                    </h3>
                    <p>{user.role}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">
                      Member Since
                    </h3>
                    <p>{user.joinDate}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="gap-2">
                  <Settings size={16} />
                  Edit Profile
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="bg-[#0d1224] border-gray-700">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your password and security preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">
                      Password
                    </h3>
                    <p>Last changed 3 months ago</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">
                      Two-Factor Authentication
                    </h3>
                    <p>Not enabled</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Change Password</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card className="bg-[#0d1224] border-gray-700">
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">
                      Email Notifications
                    </h3>
                    <p>Enabled for important updates</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Theme</h3>
                    <p>Dark</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Update Preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
