module.exports = {
  collectCoverage: true,
  coverageReporters: ['lcov', 'text'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testMatch: ['**/tests/*.[jt]s?(x)'],
  moduleNameMapper: {
    '@exmpl/(.*)': '<rootDir>/test/$1',
  },
};
