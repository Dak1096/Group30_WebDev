const dashboardController = require('../../../controllers/dashboardController');
const Dashboard = require('../../../models/Dashboard');

jest.mock('../../../models/Dashboard');

describe('Unit Test: Dashboard Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getOverview', () => {
    test('Lấy thông tin tổng quan thành công (200 OK)', async () => {
      const mockOverview = { totalStudents: 150, totalCourses: 12, averageGrade: 7.8 };
      Dashboard.overview.mockResolvedValue(mockOverview);

      await dashboardController.getOverview(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockOverview
      });
    });
  });

  describe('getCharts', () => {
    test('Lấy dữ liệu biểu đồ thành công (200 OK)', async () => {
      const mockCharts = { gradeDistribution: [5, 15, 40, 20] };
      Dashboard.charts.mockResolvedValue(mockCharts);

      await dashboardController.getCharts(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCharts
      });
    });
  });
});