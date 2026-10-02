// Unexpected failure: log the detail to the terminal, send a plain message out.
// The stack trace must never reach the client, it leaks table and column names.
module.exports = function handleError(res, err) {
  console.error(err);
  res.status(500).json({ success: false, message: 'Server error' });
};
