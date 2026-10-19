import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export const toSkipTake = ({ page, pageSize }: Pagination) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

export const toPage = <T>(items: T[], totalCount: number, { page, pageSize }: Pagination): Page<T> => ({
  items,
  page,
  pageSize,
  totalCount,
  totalPages: Math.ceil(totalCount / pageSize),
});
