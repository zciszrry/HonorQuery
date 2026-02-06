import React, { useState, useEffect } from 'react';
import './SavedPlayers.css';

interface SavedPlayer {
    id: string;
    nickname: string;
    save_time: number;
    last_used: number;
}

interface Props {
    onSelectPlayer: (playerId: string) => void;
    currentPlayerId: string;
}

const SavedPlayers: React.FC<Props> = ({ onSelectPlayer, currentPlayerId }) => {
    const [savedPlayers, setSavedPlayers] = useState<SavedPlayer[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [nickname, setNickname] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 加载保存的玩家
    const loadSavedPlayers = async () => {
        try {
            const players = await window.go.main.App.GetSavedPlayers();
            setSavedPlayers(players);
        } catch (err) {
            console.error('加载保存的玩家失败:', err);
        }
    };

    // 保存当前玩家
    const saveCurrentPlayer = async () => {
        if (!currentPlayerId.trim()) {
            alert('请输入玩家ID');
            return;
        }

        setShowModal(true);
    };

    // 确认保存
    const confirmSave = async () => {
        if (!nickname.trim()) {
            alert('请输入备注名称');
            return;
        }

        setIsLoading(true);
        try {
            const success = await window.go.main.App.SavePlayerID(currentPlayerId, nickname);
            if (success) {
                await loadSavedPlayers();
                setShowModal(false);
                setNickname('');
                alert('保存成功！');
            } else {
                alert('保存失败');
            }
        } catch (err) {
            console.error('保存失败:', err);
            alert('保存失败');
        } finally {
            setIsLoading(false);
        }
    };

    // 删除玩家
    const removePlayer = async (playerId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止触发选择事件

        if (window.confirm('确定要删除这个保存的ID吗？')) {
            try {
                const success = await window.go.main.App.RemoveSavedPlayer(playerId);
                if (success) {
                    await loadSavedPlayers();
                }
            } catch (err) {
                console.error('删除失败:', err);
            }
        }
    };

    // 格式化时间
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 初始化加载
    useEffect(() => {
        loadSavedPlayers();
    }, []);

    return (
        <div className="saved-players-container">
            {/* 保存按钮 */}
            <button
                className="save-button"
                onClick={saveCurrentPlayer}
                title="保存当前ID"
            >
                💾 保存ID
            </button>

            {/* 选择下拉框 */}
            <div className="select-container">
                <select
                    className="player-select"
                    value=""
                    onChange={(e) => {
                        const playerId = e.target.value;
                        if (playerId) {
                            onSelectPlayer(playerId);
                        }
                    }}
                >
                    <option value="">选择保存的ID...</option>
                    {savedPlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                            {player.nickname} ({player.id})
                        </option>
                    ))}
                </select>

                {/* 保存列表 */}
                {savedPlayers.length > 0 && (
                    <div className="players-list">
                        <div className="list-header">已保存的ID:</div>
                        {savedPlayers.map((player) => (
                            <div
                                key={player.id}
                                className={`player-item ${currentPlayerId === player.id ? 'active' : ''}`}
                                onClick={() => onSelectPlayer(player.id)}
                                title={`点击选择 ${player.nickname}`}
                            >
                                <div className="player-info">
                                    <span className="player-nickname">{player.nickname}</span>
                                    <span className="player-id">{player.id}</span>
                                </div>
                                <div className="player-meta">
                                    <span className="save-time">
                                        保存于: {formatTime(player.save_time)}
                                    </span>
                                    <button
                                        className="remove-btn"
                                        onClick={(e) => removePlayer(player.id, e)}
                                        title="删除"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 保存弹窗 */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>💾 保存玩家ID</h3>
                        <p>当前ID: <strong>{currentPlayerId}</strong></p>

                        <div className="input-group">
                            <label htmlFor="nickname">设置备注名称:</label>
                            <input
                                id="nickname"
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="例如: 小明/常用号/小号"
                                autoFocus
                                onKeyPress={(e) => e.key === 'Enter' && confirmSave()}
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                className="cancel-btn"
                                onClick={() => {
                                    setShowModal(false);
                                    setNickname('');
                                }}
                                disabled={isLoading}
                            >
                                取消
                            </button>
                            <button
                                className="confirm-btn"
                                onClick={confirmSave}
                                disabled={isLoading || !nickname.trim()}
                            >
                                {isLoading ? '保存中...' : '确认保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SavedPlayers;