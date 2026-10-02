// Read page and limit from the URL, capped so one request cannot pull the table
function readPaging(query) {
  const page = Math.min(Math.max(parseInt(query.page) || 1, 1), 1000000);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = readPaging;
