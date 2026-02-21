import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, FileText, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getApplication } from "@/actions/applications"
import { generateActivityDescription, getDocuments } from "@/actions/documents"

interface PageProps {
  params: Promise<{ clientId: string; applicationId: string }>
}

export default async function ApplicationDocumentsPage({ params }: PageProps) {
  const { clientId, applicationId } = await params
  const [application, documents] = await Promise.all([
    getApplication(applicationId),
    getDocuments(applicationId),
  ])

  if (!application) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}/applications/${applicationId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Generated Documents</h1>
          <p className="text-muted-foreground">
            {application.client.companyName} — {applicationId}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
            <CardDescription>Generate activity descriptions and reports</CardDescription>
          </div>
          <form
            action={async () => {
              'use server'
              await generateActivityDescription(applicationId, clientId)
            }}
          >
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" />
              Generate Activity Description
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-muted-foreground">No documents generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant="outline">{doc.documentType}</Badge>
                    </TableCell>
                    <TableCell>
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                        {doc.fileName}
                      </a>
                    </TableCell>
                    <TableCell>
                      {new Date(doc.generatedAt).toLocaleDateString("en-AU")}
                    </TableCell>
                    <TableCell>
                      {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
