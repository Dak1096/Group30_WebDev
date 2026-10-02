const Dashboard = require('../models/Dashboard');
const handleError = require('../utils/handleError');

exports.getOverview = async (req, res) => {
  try {
    res.json({ success: true, data: await Dashboard.overview() });
  } catch (err) {
    handleError(res, err);
  }
};

exports.getCharts = async (req, res) => {
  try {
    res.json({ success: true, data: await Dashboard.charts() });
  } catch (err) {
    handleError(res, err);
  }
};
