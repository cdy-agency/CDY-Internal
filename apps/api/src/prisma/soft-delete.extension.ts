import { Prisma } from '@prisma/client';

/**
 * Models that carry a `deletedAt` column, derived from the schema's DMMF so
 * this list never drifts out of sync with schema.prisma.
 */
const SOFT_DELETE_MODELS = new Set<string>(
  Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === 'deletedAt'))
    .map((model) => model.name),
);

function toDelegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function withNotDeleted(where: Record<string, unknown> | undefined): Record<string, unknown> {
  if (where && 'deletedAt' in where) {
    return where;
  }
  return { ...where, deletedAt: null };
}

/**
 * Global soft-delete enforcement, applied once via PrismaService:
 * - Read operations on any model with `deletedAt` are scoped to non-deleted
 *   rows unless the caller explicitly filters on `deletedAt` itself (e.g. an
 *   admin "trash" view querying `{ deletedAt: { not: null } }`).
 * - `delete`/`deleteMany` on those models are rewritten into
 *   `update`/`updateMany` that stamp `deletedAt`, so every existing
 *   `.delete()` call site across the codebase becomes a soft delete without
 *   per-call-site changes.
 *
 * `update`/`updateMany`/`upsert` are intentionally left untouched so a
 * "restore" flow can still target an already soft-deleted row by id.
 *
 * Known limitation: this only scopes the root query. Prisma resolves
 * `include`/`select` relations in the same SQL statement, so nested relations
 * are NOT filtered here — soft-deleted children can still surface through a
 * parent's `include`. Guard those explicitly where it matters.
 */
export function createSoftDeleteExtension() {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'soft-delete',
      query: {
        $allModels: {
          async findFirst({ model, args, query }) {
            if (SOFT_DELETE_MODELS.has(model)) {
              (args as { where?: unknown }).where = withNotDeleted(
                (args as { where?: Record<string, unknown> }).where,
              );
            }
            return query(args);
          },
          async findFirstOrThrow({ model, args, query }) {
            if (SOFT_DELETE_MODELS.has(model)) {
              (args as { where?: unknown }).where = withNotDeleted(
                (args as { where?: Record<string, unknown> }).where,
              );
            }
            return query(args);
          },
          async findMany({ model, args, query }) {
            if (SOFT_DELETE_MODELS.has(model)) {
              (args as { where?: unknown }).where = withNotDeleted(
                (args as { where?: Record<string, unknown> }).where,
              );
            }
            return query(args);
          },
          async findUnique({ model, args, query }) {
            if (SOFT_DELETE_MODELS.has(model)) {
              const where = (args as { where?: Record<string, unknown> }).where;
              if (where && !('deletedAt' in where)) {
                (args as { where?: unknown }).where = { ...where, deletedAt: null };
              }
            }
            return query(args);
          },
          async findUniqueOrThrow({ model, args, query }) {
            if (SOFT_DELETE_MODELS.has(model)) {
              const where = (args as { where?: Record<string, unknown> }).where;
              if (where && !('deletedAt' in where)) {
                (args as { where?: unknown }).where = { ...where, deletedAt: null };
              }
            }
            return query(args);
          },
          async count({ model, args, query }) {
            if (SOFT_DELETE_MODELS.has(model)) {
              (args as { where?: unknown }).where = withNotDeleted(
                (args as { where?: Record<string, unknown> }).where,
              );
            }
            return query(args);
          },
          async aggregate({ model, args, query }) {
            if (SOFT_DELETE_MODELS.has(model)) {
              (args as { where?: unknown }).where = withNotDeleted(
                (args as { where?: Record<string, unknown> }).where,
              );
            }
            return query(args);
          },
          async groupBy({ model, args, query }) {
            if (SOFT_DELETE_MODELS.has(model)) {
              (args as { where?: unknown }).where = withNotDeleted(
                (args as { where?: Record<string, unknown> }).where,
              );
            }
            return query(args);
          },
          async delete({ model, args, query }) {
            if (!SOFT_DELETE_MODELS.has(model)) {
              return query(args);
            }
            const delegate = (client as unknown as Record<string, { update: (args: unknown) => Promise<unknown> }>)[
              toDelegateName(model)
            ];
            return delegate.update({
              where: (args as { where: unknown }).where,
              data: { deletedAt: new Date() },
            });
          },
          async deleteMany({ model, args, query }) {
            if (!SOFT_DELETE_MODELS.has(model)) {
              return query(args);
            }
            const delegate = (
              client as unknown as Record<string, { updateMany: (args: unknown) => Promise<unknown> }>
            )[toDelegateName(model)];
            return delegate.updateMany({
              where: withNotDeleted((args as { where?: Record<string, unknown> }).where),
              data: { deletedAt: new Date() },
            });
          },
        },
      },
    }),
  );
}
