import '@testing-library/jest-dom'

// useOptimistic のモック（React 19の機能）
import { jest } from '@jest/globals'

// React 19のuseOptimisticをモック
global.React = require('react')

if (typeof global.React.useOptimistic === 'undefined') {
    global.React.useOptimistic = jest.fn((state, updateFn) => {
        const [optimisticState, setOptimisticState] = global.React.useState(state)

        const dispatch = (action) => {
            const newState = updateFn(state, action)
            setOptimisticState(newState)
        }

        return [optimisticState, dispatch]
    })
} 