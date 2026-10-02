// Shared validation helpers used by every controller.
// Each helper returns { value } on success or { error } with a clear message,
// so a controller can check one field in one line.

// Local part, then @, then a domain with a real top level domain
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

// Always return a trimmed string, never undefined
function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

// undefined, null and empty string all count as "not provided"
function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

// Email is optional, but must look like an email when present
function checkEmail(value) {
  if (isBlank(value)) return { value: null };
  const email = text(value).toLowerCase();
  if (email.length > 100) {
    return { error: 'Email must be 100 characters or fewer' };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: 'Email format is invalid, expected name@example.com' };
  }
  return { value: email };
}

// Route params arrive as strings, so check them before touching the database
function checkId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    return { error: label + ' must be a positive whole number' };
  }
  return { value: id };
}

// Required text field, collapses repeated spaces
function checkName(value, label, maxLength) {
  if (isBlank(value)) return { error: label + ' is required' };
  const name = text(value).replace(/\s+/g, ' ');
  if (name.length > maxLength) {
    return { error: label + ' must be ' + maxLength + ' characters or fewer' };
  }
  return { value: name };
}

// Optional text field, empty becomes NULL so the column stays clean
function checkOptionalText(value, label, maxLength) {
  if (isBlank(value)) return { value: null };
  const out = text(value).replace(/\s+/g, ' ');
  if (out.length > maxLength) {
    return { error: label + ' must be ' + maxLength + ' characters or fewer' };
  }
  return { value: out };
}

// Grade column is DECIMAL(4,2), so round to two decimal places
function checkGrade(value) {
  if (isBlank(value)) return { error: 'Grade is required' };
  const grade = Number(value);
  if (Number.isNaN(grade)) return { error: 'Grade must be a number' };
  if (grade < 0 || grade > 10) {
    return { error: 'Grade must be between 0 and 10' };
  }
  return { value: Math.round(grade * 100) / 100 };
}

// Credit is optional, whole number from 1 to 10
function checkCredit(value) {
  if (isBlank(value)) return { value: null };
  const credit = Number(value);
  if (!Number.isInteger(credit) || credit < 1 || credit > 10) {
    return { error: 'Credit must be a whole number between 1 and 10' };
  }
  return { value: credit };
}

module.exports = {
  text,
  isBlank,
  checkEmail,
  checkId,
  checkName,
  checkOptionalText,
  checkGrade,
  checkCredit,
};
