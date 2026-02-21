import { BaseService, ActionResult } from './base.service'

export interface GuidanceSyncPayload {
  categories: Array<{
    name: string
    sourceUrl: string
    items: Array<{ title: string; content: string; keywords: string[] }>
  }>
}

export type GuidanceCategoryWithItems = {
  id: string
  name: string
  sourceUrl: string
  lastSynced: Date
  items: Array<{
    id: string
    title: string
    content: string
    keywords: string[]
    updatedAt: Date
  }>
}

type GuidanceCategory = GuidanceCategoryWithItems
type GuidanceItem = GuidanceCategoryWithItems['items'][number]

class GuidanceService extends BaseService {
  private get guidancePrisma() {
    return this.prisma as unknown as {
      guidanceCategory: {
        findFirst: (args: unknown) => Promise<GuidanceCategory | null>
        create: (args: unknown) => Promise<GuidanceCategory>
        update: (args: unknown) => Promise<GuidanceCategory>
        findMany: (args: unknown) => Promise<GuidanceCategory[]>
        findUnique: (args: unknown) => Promise<GuidanceCategory | null>
      }
      guidanceItem: {
        upsert: (args: unknown) => Promise<GuidanceItem>
        findMany: (args: unknown) => Promise<GuidanceItem[]>
      }
    }
  }
  async sync(payload: GuidanceSyncPayload): Promise<ActionResult<number>> {
    try {
      let totalItems = 0

      for (const category of payload.categories) {
        const existingCategory = await this.guidancePrisma.guidanceCategory.findFirst({
          where: { name: category.name, sourceUrl: category.sourceUrl },
        })

        const categoryId = existingCategory
          ? existingCategory.id
          : (
              await this.guidancePrisma.guidanceCategory.create({
                data: {
                  name: category.name,
                  sourceUrl: category.sourceUrl,
                },
              })
            ).id

        if (existingCategory) {
          await this.guidancePrisma.guidanceCategory.update({
            where: { id: categoryId },
            data: { lastSynced: new Date() },
          })
        }

        for (const item of category.items) {
          await this.guidancePrisma.guidanceItem.upsert({
            where: {
              id: `${categoryId}:${item.title}`,
            },
            update: {
              content: item.content,
              keywords: item.keywords,
            },
            create: {
              id: `${categoryId}:${item.title}`,
              categoryId,
              title: item.title,
              content: item.content,
              keywords: item.keywords,
            },
          })
          totalItems++
        }
      }

      return { success: true, data: totalItems }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async listCategories(): Promise<GuidanceCategory[]> {
    return this.guidancePrisma.guidanceCategory.findMany({
      orderBy: { name: 'asc' },
    })
  }

  async getCategory(id: string): Promise<GuidanceCategoryWithItems | null> {
    return this.guidancePrisma.guidanceCategory.findUnique({
      where: { id },
      include: { items: true },
    })
  }

  async matchByKeywords(text: string, limit = 5): Promise<GuidanceItem[]> {
    if (!text.trim()) return []

    const tokens = text
      .toLowerCase()
      .split(/\W+/)
      .filter((token) => token.length > 2)

    if (tokens.length === 0) return []

    return this.guidancePrisma.guidanceItem.findMany({
      where: {
        keywords: { hasSome: tokens },
      },
      take: limit,
    })
  }
}

export const guidanceService = new GuidanceService()
