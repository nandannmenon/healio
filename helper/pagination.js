
const parsePaginationParams = (req, options = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100
  } = options;

  let page = parseInt(req.query.page) || defaultPage;
  let limit = parseInt(req.query.limit) || defaultLimit;

  // Ensure positive values
  page = Math.max(1, page);
  limit = Math.max(1, Math.min(limit, maxLimit));

  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset
  };
};


//Create pagination metadata

const createPaginationMeta = (totalItems, currentPage, itemsPerPage) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    currentPage: parseInt(currentPage),
    totalPages,
    totalItems,
    itemsPerPage: parseInt(itemsPerPage),
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? currentPage + 1 : null,
    prevPage: hasPrevPage ? currentPage - 1 : null
  };
};

//Simple paginate function for controllers
const paginate = (totalItems, currentPage, itemsPerPage) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    currentPage: parseInt(currentPage),
    totalPages,
    totalItems,
    itemsPerPage: parseInt(itemsPerPage),
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? currentPage + 1 : null,
    prevPage: hasPrevPage ? currentPage - 1 : null
  };
};


// Create paginated response
const createPaginatedResponse = (data, totalItems, paginationParams, additionalMeta = {}) => {
  const { page, limit } = paginationParams;
  const pagination = createPaginationMeta(totalItems, page, limit);

  return {
    success: true,
    data,
    pagination,
    ...additionalMeta
  };
};

 // Apply pagination to Sequelize query options
const applyPaginationToQuery = (req, options = {}) => {
  const paginationParams = parsePaginationParams(req, options);
  
  return {
    limit: paginationParams.limit,
    offset: paginationParams.offset,
    paginationParams
  };
};

module.exports = {
  parsePaginationParams,
  createPaginationMeta,
  createPaginatedResponse,
  applyPaginationToQuery,
  paginate
}; 