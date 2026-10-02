const readPaging = require('../../../utils/paging');

describe('Unit Test: Utility Paging (readPaging)', () => {
    test('Trả về giá trị mặc định khi query rỗng', () => {
        const result = readPaging({});
        expect(result).toEqual({
            page: 1,
            limit: 10,
            offset: 0
        });
    });

    test('Tính toán đúng page, limit, offset với tham số hợp lệ', () => {
        const result = readPaging({ page: '2', limit: '15' });
        expect(result).toEqual({
            page: 2,
            limit: 15,
            offset: 15 // (2 - 1) * 15 = 15
        });
    });

    test('Tự động ép về giá trị tối thiểu khi nhập số âm hoặc chữ', () => {
        const result = readPaging({ page: '-5', limit: 'abc' });
        expect(result).toEqual({
            page: 1,
            limit: 10,
            offset: 0
        });
    });

    test('Giới hạn mốc tối đa (max page = 1,000,000, max limit = 100)', () => {
        const result = readPaging({ page: '2000000', limit: '500' });
        expect(result).toEqual({
            page: 1000000,
            limit: 100,
            offset: 99999900
        });
    });
});