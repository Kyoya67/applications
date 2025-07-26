const nextJest = require('next/jest')

const createJestConfig = nextJest({
    // Next.js アプリのパスを指定
    dir: './',
})

// Jestのカスタム設定
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jsdom',
    moduleDirectories: ['node_modules', '<rootDir>/'],
    testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
}

// Next.js用の設定とマージして返す
module.exports = createJestConfig(customJestConfig) 