export const defaultPagination = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 1,
  has_prev: false,
  has_next: false,
};

export const parseListResponse = (response) => {
  const body = response?.data || {};
  const data = body.data;

  if (Array.isArray(data)) {
    return {
      items: data,
      pagination: body.pagination || {
        ...defaultPagination,
        total: body.count ?? data.length,
        pages: Math.max(Math.ceil((body.count ?? data.length) / defaultPagination.limit), 1),
      },
    };
  }

  if (Array.isArray(data?.items)) {
    return {
      items: data.items,
      pagination: data.pagination || body.pagination || defaultPagination,
    };
  }

  return {
    items: [],
    pagination: body.pagination || defaultPagination,
  };
};

export const pageSummary = (pagination, label) => {
  const total = Number(pagination?.total || 0);
  const limit = Number(pagination?.limit || 10);
  const page = Number(pagination?.page || 1);

  if (!total) return `No ${label} found`;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return `Showing ${from}-${to} of ${total} ${label}`;
};

export const listParams = ({ search, sortConfig, pagination }) => ({
  search: search?.trim() || undefined,
  sort_by: sortConfig?.field,
  order: sortConfig?.order,
  page: pagination?.page || 1,
  limit: pagination?.limit || 10,
});
