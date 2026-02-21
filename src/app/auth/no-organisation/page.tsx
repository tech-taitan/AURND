import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NoOrganisationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">No Organisation</CardTitle>
          <CardDescription>
            Your account is not associated with any organisation. Please contact
            your administrator to be added to an organisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Once you have been assigned to an organisation, you will be able to
            access the R&D Tax Application Manager.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
