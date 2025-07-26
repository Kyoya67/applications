import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { ClientPhotoComment } from '../client';

// postComment のモック
jest.mock('../action', () => ({
    postComment: jest.fn()
}));

// React hooksのモック
jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useOptimistic: jest.fn(),
}));

const mockPostComment = require('../action').postComment;
const mockUseOptimistic = require('react').useOptimistic;

// 基本的なprops
const defaultProps = {
    photoId: 'photo123',
    userId: 'user123',
    defaultComments: [
        { id: 'comment1', comment: '古いコメント1', authorId: 'author1', photoId: 'photo123', createdAt: '2025-07-01T00:00:00Z' },
        { id: 'comment2', comment: '古いコメント2', authorId: 'author2', photoId: 'photo123', createdAt: '2025-07-02T00:00:00Z' }
    ],
    authors: [
        { id: 'author1', name: 'ユーザー1', image: null, profile: { screenName: 'user1' } },
        { id: 'author2', name: 'ユーザー2', image: null, profile: { screenName: 'user2' } }
    ]
};

describe('ClientPhotoComment - 連続投稿テスト', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // useOptimistic のモック実装
        let optimisticState = defaultProps.defaultComments;
        let updateFunction: any;

        mockUseOptimistic.mockImplementation((initialState: any, updateFn: any) => {
            updateFunction = updateFn;

            const addOptimisticComment = (newComment: any) => {
                optimisticState = updateFn(optimisticState, newComment);
            };

            return [optimisticState, addOptimisticComment];
        });
    });

    test('連続投稿の動作確認（問題検証）', async () => {
        // 手動でuseOptimisticの動作をテスト
        const initialComments = [
            { id: 'comment1', comment: '古いコメント1', authorId: 'author1' },
            { id: 'comment2', comment: '古いコメント2', authorId: 'author2' }
        ];

        // useOptimisticのupdateFunctionをテスト
        const updateFn = (prevComments: any[], newComment: any) => {
            if (prevComments.length <= 1) return [newComment];
            if (prevComments[0]?.comment === newComment.comment) return prevComments;
            return [{ ...newComment, sending: true }, ...prevComments];
        };

        // 1回目の追加
        const comment1 = { id: 'new1', comment: 'テスト1', authorId: 'user123' };
        const afterFirst = updateFn(initialComments, comment1);

        console.log('1回目追加後:', afterFirst);
        expect(afterFirst).toHaveLength(3);
        expect(afterFirst[0].comment).toBe('テスト1');

        // 2回目の追加（重要：prevCommentsは何を参照するか）
        const comment2 = { id: 'new2', comment: 'テスト2', authorId: 'user123' };

        // 問題：prevCommentsはinitialCommentsを参照？それともafterFirstを参照？
        const afterSecond = updateFn(initialComments, comment2); // ←ここがポイント

        console.log('2回目追加後:', afterSecond);
        console.log('テスト1はまだ存在するか:', afterSecond.some(c => c.comment === 'テスト1'));

        // この結果で問題が確認できる
        expect(afterSecond.some(c => c.comment === 'テスト1')).toBe(false); // テスト1が消える
    });

    test('setCommentsの動作シミュレーション', async () => {
        const defaultComments = [
            { id: 'comment1', comment: '古いコメント1' },
            { id: 'comment2', comment: '古いコメント2' }
        ];

        // 実際のコードの動作をシミュレート
        console.log('初期 defaultComments:', defaultComments);

        // 1回目のコメント完了
        const newComment1 = { id: 'new1', comment: 'テスト1' };
        const afterFirst = [newComment1, ...defaultComments];
        console.log('1回目完了後 comments:', afterFirst);

        // 2回目のコメント完了（問題のコード）
        const newComment2 = { id: 'new2', comment: 'テスト2' };
        const afterSecond = [newComment2, ...defaultComments]; // ←defaultCommentsを再使用
        console.log('2回目完了後 comments:', afterSecond);

        // テスト1が消えていることを確認
        expect(afterSecond.some(c => c.comment === 'テスト1')).toBe(false);
        console.log('❌ 問題確認：テスト1が消えました');
    });

    test('修正版の動作シミュレーション', async () => {
        const defaultComments = [
            { id: 'comment1', comment: '古いコメント1' },
            { id: 'comment2', comment: '古いコメント2' }
        ];

        let currentComments = defaultComments;

        // 1回目のコメント完了
        const newComment1 = { id: 'new1', comment: 'テスト1' };
        currentComments = [newComment1, ...currentComments]; // 修正版
        console.log('1回目完了後 comments:', currentComments);

        // 2回目のコメント完了（修正版）
        const newComment2 = { id: 'new2', comment: 'テスト2' };
        currentComments = [newComment2, ...currentComments]; // 最新のcommentsを使用
        console.log('2回目完了後 comments:', currentComments);

        // テスト1が残っていることを確認
        expect(currentComments.some(c => c.comment === 'テスト1')).toBe(true);
        expect(currentComments.some(c => c.comment === 'テスト2')).toBe(true);
        console.log('✅ 修正版：両方のコメントが存在します');
    });
}); 