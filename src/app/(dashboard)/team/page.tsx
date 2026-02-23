import { Users, Plus, Mail, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const teamMembers = [
  {
    name: "Test User",
    email: "test@example.com",
    role: "Admin",
    status: "Active",
  },
]

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Team Management</h1>
          <p className="text-muted-foreground">
            Manage team members and their access permissions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            People with access to this organisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.email}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {member.role}
                  </Badge>
                  <Badge variant="default">{member.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Roles Info */}
      <Card>
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <CardDescription>
            Understanding permission levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="font-medium">Admin</p>
              <p className="text-sm text-muted-foreground">
                Full access to all features, can manage team members and organisation settings
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium">Manager</p>
              <p className="text-sm text-muted-foreground">
                Can manage clients, projects, and applications. Cannot manage team or settings
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium">Practitioner</p>
              <p className="text-sm text-muted-foreground">
                Can view and edit assigned clients only
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium">Read Only</p>
              <p className="text-sm text-muted-foreground">
                View-only access to assigned clients
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
