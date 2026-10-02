const {
  checkEmail,
  checkId,
  checkName,
  checkOptionalText,
  checkGrade,
  checkCredit,
  isBlank,
} = require('../../../utils/validators');

describe('Unit Test: Validators', () => {
  describe('checkEmail', () => {
    test('Empty email becomes NULL, it is optional', () => {
      expect(checkEmail('').value).toBeNull();
      expect(checkEmail(undefined).value).toBeNull();
      expect(checkEmail(null).value).toBeNull();
    });

    test('Accepts a normal email and lowercases it', () => {
      expect(checkEmail('  Student@Gmail.COM  ').value).toBe('student@gmail.com');
    });

    test('Rejects an address with no at sign', () => {
      expect(checkEmail('student.gmail.com').error).toBeDefined();
    });

    test('Rejects an address with no top level domain', () => {
      expect(checkEmail('a@b').error).toBeDefined();
    });

    test('Rejects an address containing a space', () => {
      expect(checkEmail('a b@mail.com').error).toBeDefined();
    });

    test('Rejects an address longer than 100 characters', () => {
      expect(checkEmail('a'.repeat(95) + '@mail.com').error).toBeDefined();
    });
  });

  describe('checkId', () => {
    test('Accepts a numeric string from a route param', () => {
      expect(checkId('12', 'Student id').value).toBe(12);
    });

    test('Rejects text', () => {
      expect(checkId('abc', 'Student id').error).toBeDefined();
    });

    test('Rejects zero and negative numbers', () => {
      expect(checkId('0', 'Student id').error).toBeDefined();
      expect(checkId('-3', 'Student id').error).toBeDefined();
    });

    test('Rejects a decimal', () => {
      expect(checkId('1.5', 'Student id').error).toBeDefined();
    });

    test('The message names the field', () => {
      expect(checkId('abc', 'Course id').error).toContain('Course id');
    });
  });

  describe('checkName', () => {
    test('Rejects an empty name', () => {
      expect(checkName('   ', 'Student name', 100).error).toBeDefined();
    });

    test('Trims and collapses repeated spaces', () => {
      expect(checkName('  Nguyen   Van  A  ', 'Student name', 100).value).toBe('Nguyen Van A');
    });

    test('Rejects a name over the limit', () => {
      expect(checkName('a'.repeat(101), 'Student name', 100).error).toBeDefined();
    });
  });

  describe('checkOptionalText', () => {
    test('Empty becomes NULL', () => {
      expect(checkOptionalText('', 'Class name', 50).value).toBeNull();
    });

    test('Keeps a real value', () => {
      expect(checkOptionalText(' CNTT01 ', 'Class name', 50).value).toBe('CNTT01');
    });
  });

  describe('checkGrade', () => {
    test('Rejects a missing grade', () => {
      expect(checkGrade('').error).toBeDefined();
      expect(checkGrade(undefined).error).toBeDefined();
    });

    test('Accepts both ends of the range', () => {
      expect(checkGrade(0).value).toBe(0);
      expect(checkGrade(10).value).toBe(10);
    });

    test('Rejects a value outside 0 to 10', () => {
      expect(checkGrade(-1).error).toBeDefined();
      expect(checkGrade(10.5).error).toBeDefined();
    });

    test('Rejects text', () => {
      expect(checkGrade('nine').error).toBeDefined();
    });

    test('Rounds to two decimals to fit DECIMAL(4,2)', () => {
      expect(checkGrade(7.456).value).toBe(7.46);
    });
  });

  describe('checkCredit', () => {
    test('Empty becomes NULL, it is optional', () => {
      expect(checkCredit('').value).toBeNull();
    });

    test('Accepts a whole number inside the range', () => {
      expect(checkCredit('3').value).toBe(3);
    });

    test('Rejects a value outside 1 to 10', () => {
      expect(checkCredit(0).error).toBeDefined();
      expect(checkCredit(11).error).toBeDefined();
    });

    test('Rejects a decimal', () => {
      expect(checkCredit(2.5).error).toBeDefined();
    });
  });

  describe('isBlank', () => {
    test('Treats undefined, null and spaces as blank', () => {
      expect(isBlank(undefined)).toBe(true);
      expect(isBlank(null)).toBe(true);
      expect(isBlank('   ')).toBe(true);
    });

    test('Zero is not blank', () => {
      expect(isBlank(0)).toBe(false);
    });
  });
});
