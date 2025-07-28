import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { ClientPhotoComment } from '../client';

// postComment のモック
jest.mock('../action', () => ({
    postComment: jest.fn()
}));

const mockPostComment = require('../action').postComment;

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

describe('ClientPhotoComment - 実際のコンポーネントテスト', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('実際のコンポーネントで連続投稿をテスト', async () => {
        // Server Action のレスポンスをモック
        mockPostComment
            .mockResolvedValueOnce({
                comment: { id: 'comment3', comment: 'テスト1', authorId: 'user123', photoId: 'photo123', createdAt: '2025-07-26T10:00:00Z' }
            })
            .mockResolvedValueOnce({
                comment: { id: 'comment4', comment: 'テスト2', authorId: 'user123', photoId: 'photo123', createdAt: '2025-07-26T10:01:00Z' }
            });

        // 実際のコンポーネントをレンダリング
        render(<ClientPhotoComment {...defaultProps} />);

        // 初期状態の確認
        expect(screen.getByText('古いコメント1')).toBeInTheDocument();
        expect(screen.getByText('古いコメント2')).toBeInTheDocument();

        const commentInput = screen.getByPlaceholderText('この写真へコメントを入力...');

        // 【1回目の投稿】
        await act(async () => {
            fireEvent.change(commentInput, { target: { value: 'テスト1' } });
            fireEvent.submit(commentInput.closest('form')!);
        });

        // Optimistic Update で即座に表示される
        expect(screen.getByText('テスト1')).toBeInTheDocument();
        console.log('1回目投稿後の画面:', screen.getByText('テスト1').textContent);

        // 【2回目の投稿（1回目完了前）】
        await act(async () => {
            fireEvent.change(commentInput, { target: { value: 'テスト2' } });
            fireEvent.submit(commentInput.closest('form')!);
        });

        // 2回目のOptimistic Update
        expect(screen.getByText('テスト2')).toBeInTheDocument();

        // 重要：テスト1がまだ表示されているか？
        const test1Elements = screen.queryAllByText('テスト1');
        const test2Elements = screen.queryAllByText('テスト2');

        console.log('2回目投稿後:');
        console.log('- テスト1要素数:', test1Elements.length);
        console.log('- テスト2要素数:', test2Elements.length);

        // この時点でテスト1が消えているかもしれない
        if (test1Elements.length === 0) {
            console.log('❌ 問題確認：テスト1が画面から消えました（Optimistic Update段階）');
        } else {
            console.log('✅ Optimistic Update段階では両方表示');
        }

        // Server Actions の完了を待つ
        await waitFor(() => {
            expect(mockPostComment).toHaveBeenCalledTimes(2);
        });

        // 最終的な表示状態をチェック
        await waitFor(() => {
            const finalTest1 = screen.queryAllByText('テスト1');
            const finalTest2 = screen.queryAllByText('テスト2');

            console.log('Server Action完了後:');
            console.log('- テスト1要素数:', finalTest1.length);
            console.log('- テスト2要素数:', finalTest2.length);

            expect(screen.getByText('テスト2')).toBeInTheDocument();

            // 重要なテスト：テスト1も表示されているか？
            if (finalTest1.length === 0) {
                console.log('❌ 確定：テスト1が最終的に消えました');
                // これがバグの証明
                expect(finalTest1.length).toBeGreaterThan(0); // このテストは失敗するはず
            } else {
                console.log('✅ 両方のコメントが最終的に表示されている');
            }
        });
    });

    test('遅いServer Actionでの連続投稿テスト', async () => {
        // より現実的なタイミングでテスト
        let resolveFirst: (value: any) => void;
        let resolveSecond: (value: any) => void;

        mockPostComment
            .mockImplementationOnce(() => new Promise(resolve => {
                resolveFirst = resolve;
            }))
            .mockImplementationOnce(() => new Promise(resolve => {
                resolveSecond = resolve;
            }));

        render(<ClientPhotoComment {...defaultProps} />);

        const commentInput = screen.getByPlaceholderText('この写真へコメントを入力...');

        // 1回目投稿
        await act(async () => {
            fireEvent.change(commentInput, { target: { value: '遅い1' } });
            fireEvent.submit(commentInput.closest('form')!);
        });

        expect(screen.getByText('遅い1')).toBeInTheDocument();

        // 2回目投稿（1回目がまだ完了していない）
        await act(async () => {
            fireEvent.change(commentInput, { target: { value: '遅い2' } });
            fireEvent.submit(commentInput.closest('form')!);
        });

        // この時点での状態確認
        const slow1Count = screen.queryAllByText('遅い1').length;
        const slow2Count = screen.queryAllByText('遅い2').length;

        console.log('両方未完了時:');
        console.log('- 遅い1要素数:', slow1Count);
        console.log('- 遅い2要素数:', slow2Count);

        // 1回目を先に完了
        await act(async () => {
            resolveFirst!({
                comment: { id: 'slow1', comment: '遅い1', authorId: 'user123', photoId: 'photo123', createdAt: '2025-07-26T10:00:00Z' }
            });
        });

        // 2回目を完了
        await act(async () => {
            resolveSecond!({
                comment: { id: 'slow2', comment: '遅い2', authorId: 'user123', photoId: 'photo123', createdAt: '2025-07-26T10:01:00Z' }
            });
        });

        // 最終確認
        await waitFor(() => {
            const finalSlow1 = screen.queryAllByText('遅い1');
            const finalSlow2 = screen.queryAllByText('遅い2');

            console.log('全完了後:');
            console.log('- 遅い1要素数:', finalSlow1.length);
            console.log('- 遅い2要素数:', finalSlow2.length);

            // バグがあれば、どちらかが消えている
            if (finalSlow1.length === 0 || finalSlow2.length === 0) {
                console.log('❌ バグ確認：コメントが消えています');
            } else {
                console.log('✅ 両方のコメントが表示されている');
            }
        });
    });

    test('setCommentsのロジック検証（ユニットテスト）', () => {
        // これは実装のロジックだけをテストする補助的なテスト
        const defaultComments = [
            { id: 'comment1', comment: '古いコメント1' },
            { id: 'comment2', comment: '古いコメント2' }
        ];

        console.log('=== setCommentsロジック検証 ===');

        // 現在の実装（バグあり）
        console.log('現在の実装:');
        const current_afterFirst = [{ id: 'new1', comment: 'テスト1' }, ...defaultComments];
        console.log('1回目完了後:', current_afterFirst.map(c => c.comment));

        const current_afterSecond = [{ id: 'new2', comment: 'テスト2' }, ...defaultComments]; // バグ！
        console.log('2回目完了後:', current_afterSecond.map(c => c.comment));
        console.log('テスト1が残ってる？', current_afterSecond.some(c => c.comment === 'テスト1'));

        // 修正版の実装
        console.log('\n修正版の実装:');
        let fixed_comments = defaultComments;
        fixed_comments = [{ id: 'new1', comment: 'テスト1' }, ...fixed_comments];
        console.log('1回目完了後:', fixed_comments.map(c => c.comment));

        fixed_comments = [{ id: 'new2', comment: 'テスト2' }, ...fixed_comments];
        console.log('2回目完了後:', fixed_comments.map(c => c.comment));
        console.log('テスト1が残ってる？', fixed_comments.some(c => c.comment === 'テスト1'));

        // アサーション
        expect(current_afterSecond.some(c => c.comment === 'テスト1')).toBe(false); // 現在はバグ
        expect(fixed_comments.some(c => c.comment === 'テスト1')).toBe(true); // 修正版は正常
    });
}); 