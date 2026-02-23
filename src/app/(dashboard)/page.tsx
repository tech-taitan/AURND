import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { dashboardService } from "@/services/dashboard.service"
import { requireOrganisation } from "@/lib/auth"

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function DashboardPage() {
  const user = await requireOrganisation()

  const [stats, deadlines, activities] = await Promise.all([
    dashboardService.getStats(user.organisationId!),
    dashboardService.getUpcomingDeadlines(user.organisationId!, 5),
    dashboardService.getRecentActivity(user.organisationId!, 5),
  ])

  const statCards = [
    {
      title: "Total Clients",
      value: stats.totalClients.toString(),
      change: "Registered clients",
      icon: Building2,
    },
    {
      title: "Active Applications",
      value: stats.activeApplications.toString(),
      change: "In progress",
      icon: FileText,
    },
    {
      title: "Total R&D Expenditure",
      value: formatCurrency(stats.totalExpenditure),
      change: "All applications",
      icon: DollarSign,
    },
    {
      title: "Expected Offset",
      value: formatCurrency(stats.expectedOffset),
      change: "Estimated total",
      icon: TrendingUp,
    },
  ]

  // Calculate alerts
  const urgentDeadlines = deadlines.filter((d) => d.daysRemaining <= 90).length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of R&D Tax Incentive applications
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Building2 className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>
              Registration and lodgement deadlines
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deadlines.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No upcoming deadlines
              </p>
            ) : (
              <div className="space-y-4">
                {deadlines.map((deadline) => (
                  <Link
                    key={deadline.clientId}
                    href={`/clients/${deadline.clientId}`}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{deadline.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {deadline.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          deadline.daysRemaining <= 30
                            ? "destructive"
                            : deadline.daysRemaining <= 90
                            ? "warning"
                            : "default"
                        }
                      >
                        {deadline.daysRemaining} days
                      </Badge>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {deadline.deadline.toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Button variant="ghost" className="mt-4 w-full" asChild>
              <Link href="/applications">
                View all applications
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across all clients</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={`${activity.entityType}-${activity.entityId}-${activity.timestamp.getTime()}`}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{activity.action}</p>
                      {activity.clientName && (
                        <p className="text-sm text-muted-foreground">
                          {activity.clientName}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {dashboardService.formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {urgentDeadlines > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-800 dark:text-yellow-200">
            <ul className="space-y-2 text-sm">
              <li>
                • {urgentDeadlines} client{urgentDeadlines !== 1 ? "s have" : " has"}{" "}
                registration deadline{urgentDeadlines !== 1 ? "s" : ""} within 90 days
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stats.totalClients === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No clients yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Get started by adding your first R&D Tax Incentive client.
            </p>
            <Button asChild className="mt-4">
              <Link href="/clients/new">
                <Building2 className="mr-2 h-4 w-4" />
                Add Your First Client
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
