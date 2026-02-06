import React, { useState, useEffect } from 'react';
import './App.css';
// 在 import 部分，添加后端的函数
import {
    QueryBattleData,
    GetGameModes,
    SavePlayerID,
    GetSavedPlayers,
    RemoveSavedPlayer
} from "../wailsjs/go/main/App";

// 类型定义
interface GameRecord {
    time: string;
    heroName: string;
    heroIcon?: string;
    kills: number;
    deaths: number;
    assists: number;
    score: string;
    result: string;
    mode: string;
    resultClass: string;
}

interface SummaryData {
    totalGames: number;
    winRate: string;
    avgKDA: string;
    totalWins: number;
    totalLoss: number;
}

interface BattleData {
    success: boolean;
    total: number;
    summary: SummaryData;
    recentGames: GameRecord[];
    message?: string;
}

function App() {
    // 状态管理
    const [playerID, setPlayerID] = useState("");
    const [selectedMode, setSelectedMode] = useState("1");
    const [gameModes, setGameModes] = useState<Array<{value: string, label: string}>>([]);
    const [loading, setLoading] = useState(false);
    const [battleData, setBattleData] = useState<BattleData | null>(null);
    const [error, setError] = useState<string>("");
    // 在现有useState后面添加
    const [savedPlayers, setSavedPlayers] = useState<Array<{id: string, nickname: string}>>([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveNickname, setSaveNickname] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // 初始化时获取游戏模式列表
    useEffect(() => {
        async function loadGameModes() {
            try {
                const modes = await GetGameModes();
                setGameModes(modes);
            } catch (err) {
                console.error("获取游戏模式失败:", err);
            }
        }
        loadGameModes();
    }, []);

// 修改加载保存玩家的 useEffect
    useEffect(() => {
        const loadSavedPlayers = async () => {
            console.log("开始加载保存的玩家...");

            try {
                // 尝试从 Go 后端加载
                console.log("尝试从 Go 后端加载...");
                const goPlayers = await GetSavedPlayers();
                console.log("从 Go 后端获取到玩家数据:", goPlayers);

                if (goPlayers && Array.isArray(goPlayers) && goPlayers.length > 0) {
                    // 转换格式：Go 后端返回的是大写字段，转换为前端的小写字段
                    const formattedPlayers = goPlayers.map((player: any) => ({
                        id: player.ID || player.id,
                        nickname: player.Nickname || player.nickname,
                        saveTime: player.SaveTime || player.save_time,
                        lastUsed: player.LastUsed || player.last_used
                    }));

                    console.log("格式化后的玩家数据:", formattedPlayers);
                    setSavedPlayers(formattedPlayers);

                    // 同时保存一份到 localStorage 作为备份
                    localStorage.setItem('savedPlayers', JSON.stringify(formattedPlayers));
                } else {
                    console.log("Go 后端没有数据，尝试从 localStorage 加载...");
                    // 如果 Go 后端没有数据，尝试从 localStorage 加载
                    const saved = localStorage.getItem('savedPlayers');
                    if (saved) {
                        try {
                            const localPlayers = JSON.parse(saved);
                            console.log("从 localStorage 获取到玩家:", localPlayers);
                            setSavedPlayers(localPlayers);
                        } catch (err) {
                            console.error('解析 localStorage 数据失败:', err);
                            setSavedPlayers([]);
                        }
                    }
                }
            } catch (goErr) {
                console.warn("从 Go 后端加载失败，尝试从 localStorage:", goErr);

                // Go 后端失败时，从 localStorage 加载
                const saved = localStorage.getItem('savedPlayers');
                if (saved) {
                    try {
                        const localPlayers = JSON.parse(saved);
                        console.log("从 localStorage 获取到玩家:", localPlayers);
                        setSavedPlayers(localPlayers);
                    } catch (err) {
                        console.error('解析 localStorage 数据失败:', err);
                        setSavedPlayers([]);
                    }
                }
            }
        };

        loadSavedPlayers();
    }, []);

    // 查询战绩
    const queryBattle = async () => {
        if (!playerID.trim()) {
            setError("请输入玩家ID");
            return;
        }

        setLoading(true);
        setError("");
        setBattleData(null);

        try {
            // 硬编码的API密钥
            const apiKey = "jIKCLnXuixWwVzS4usxk3wSiYc";
            const result = await QueryBattleData(apiKey, playerID, selectedMode);

            if (result.success) {
                setBattleData(result);
            } else {
                setError(result.message || "查询失败");
            }
        } catch (err: any) {
            setError(err.message || "网络请求失败");
        } finally {
            setLoading(false);
        }
    };

    // 处理回车键查询
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            queryBattle();
        }
    };

    // 获取英雄颜色（根据评分）
    const getScoreColor = (score: string): string => {
        const scoreNum = parseFloat(score);
        if (scoreNum >= 10) return '#10b981'; // 绿色
        if (scoreNum >= 8) return '#f59e0b';  // 黄色
        if (scoreNum >= 6) return '#f97316';  // 橙色
        return '#ef4444';                     // 红色
    };

    // 获取模式显示名称
    const getModeLabel = (value: string): string => {
        const mode = gameModes.find(m => m.value === value);
        return mode ? mode.label : value;
    };

    // 2. 添加选择玩家函数
    const handleSelectPlayer = (playerId: string) => {
        setPlayerID(playerId);
        // 可选：自动触发查询
        // queryBattle();
    };
    // 保存当前玩家
    const saveCurrentPlayer = () => {
        if (!playerID.trim()) {
            alert('请输入玩家ID');
            return;
        }
        setShowSaveModal(true);
    };

    // 确认保存
    const confirmSave = async () => {
        if (!saveNickname.trim()) {
            alert('请输入备注名称');
            return;
        }

        setIsSaving(true);
        try {
            // 调用 Go 后端保存
            console.log("正在保存到 Go 后端...", playerID, saveNickname);
            const success = await SavePlayerID(playerID, saveNickname);

            if (success) {
                console.log("已成功保存到 Go 后端");

                // 重新加载保存的玩家列表
                const updatedPlayers = await GetSavedPlayers();
                if (updatedPlayers && Array.isArray(updatedPlayers)) {
                    const formattedPlayers = updatedPlayers.map((player: any) => ({
                        id: player.ID || player.id,
                        nickname: player.Nickname || player.nickname,
                        saveTime: player.SaveTime || player.save_time,
                        lastUsed: player.LastUsed || player.last_used
                    }));

                    setSavedPlayers(formattedPlayers);

                    // 同时更新 localStorage
                    localStorage.setItem('savedPlayers', JSON.stringify(formattedPlayers));
                }

                setShowSaveModal(false);
                setSaveNickname('');
                alert('保存成功！');
            } else {
                throw new Error('保存失败，Go后端返回false');
            }
        } catch (err) {
            console.error('保存失败:', err);

            // Go 后端保存失败时，尝试使用 localStorage 作为备选
            try {
                console.log("Go后端保存失败，尝试使用 localStorage");
                const newPlayer = {
                    id: playerID,
                    nickname: saveNickname,
                    saveTime: Math.floor(Date.now() / 1000),
                    lastUsed: Math.floor(Date.now() / 1000)
                };
                const existingPlayers = JSON.parse(localStorage.getItem('savedPlayers') || '[]');
                const updatedPlayers = [...existingPlayers.filter((p: any) => p.id !== playerID), newPlayer];

                localStorage.setItem('savedPlayers', JSON.stringify(updatedPlayers));
                setSavedPlayers(updatedPlayers);

                setShowSaveModal(false);
                setSaveNickname('');
                alert('保存到本地缓存成功（后端保存失败）');
            } catch (localErr) {
                console.error('本地保存也失败:', localErr);
                alert('保存失败，请检查控制台');
            }
        } finally {
            setIsSaving(false);
        }
    };

    // 删除保存的玩家
    const removeSavedPlayer = async (playerId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止触发选择事件

        if (window.confirm('确定要删除这个保存的ID吗？')) {
            try {
                // 调用 Go 后端删除
                const success = await RemoveSavedPlayer(playerId);

                if (success) {
                    // 重新加载保存的玩家列表
                    const updatedPlayers = await GetSavedPlayers();
                    if (updatedPlayers && Array.isArray(updatedPlayers)) {
                        const formattedPlayers = updatedPlayers.map((player: any) => ({
                            id: player.ID || player.id,
                            nickname: player.Nickname || player.nickname
                        }));

                        setSavedPlayers(formattedPlayers);

                        // 同步更新 localStorage
                        localStorage.setItem('savedPlayers', JSON.stringify(formattedPlayers));
                    }
                    alert('删除成功！');
                } else {
                    throw new Error('删除失败，Go后端返回false');
                }
            } catch (goErr) {
                console.warn('Go后端删除失败，尝试本地删除:', goErr);

                // Go 后端失败时，本地删除
                const existingPlayers = JSON.parse(localStorage.getItem('savedPlayers') || '[]');
                const updatedPlayers = existingPlayers.filter((player: any) => player.id !== playerId);

                localStorage.setItem('savedPlayers', JSON.stringify(updatedPlayers));
                setSavedPlayers(updatedPlayers);
                alert('从本地缓存删除成功（后端删除失败）');
            }
        }
    };

    return (
        <div className="app-container">
            {/* 头部 */}
            <header className="app-header">
                <h1>🎮 王者荣耀战绩查询</h1>
                <p className="subtitle">快速查询玩家战绩数据</p>
            </header>

            {/* 主内容 */}
            <main className="app-main">
                {/* 3. 添加保存和选择组件（放在查询面板之前） */}
                <div className="save-select-section">
                    <div className="save-select-row">
                        <div className="save-id-container">
                            <button
                                className="save-id-button"
                                onClick={saveCurrentPlayer}
                                disabled={loading || !playerID.trim()}
                                title="保存当前玩家ID"
                            >
                                💾 保存ID
                            </button>
                            <span className="save-hint">
                                保存后可在下拉框中选择
                            </span>
                        </div>

                        <div className="select-saved-container">
                            <select
                                className="saved-players-select"
                                value=""
                                onChange={(e) => {
                                    const selectedId = e.target.value;
                                    if (selectedId) {
                                        handleSelectPlayer(selectedId);
                                    }
                                }}
                                disabled={loading}
                            >
                                <option value="">选择已保存的ID...</option>
                                {savedPlayers.map((player) => (
                                    <option key={player.id} value={player.id}>
                                        {player.nickname} ({player.id})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 保存的玩家列表（简洁显示） */}
                    {savedPlayers.length > 0 && (
                        <div className="saved-players-list">
                            <div className="saved-players-header">
                                <span>已保存 ({savedPlayers.length}个):</span>
                            </div>
                            <div className="saved-players-items">
                                {savedPlayers.map((player) => (
                                    <div
                                        key={player.id}
                                        className={`saved-player-item ${playerID === player.id ? 'active' : ''}`}
                                        onClick={() => handleSelectPlayer(player.id)}
                                        title={`点击选择 ${player.nickname}`}
                                    >
                                        <div className="player-main">
                                            <span className="player-nickname">{player.nickname}</span>
                                            <span className="player-id">{player.id}</span>
                                        </div>
                                        <button
                                            className="remove-player-btn"
                                            onClick={(e) => removeSavedPlayer(player.id, e)}
                                            title="删除"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 查询面板 */}
                <div className="query-panel">
                    <div className="input-group">
                        <div className="input-field">
                            <label htmlFor="playerID">玩家 ID</label>
                            <input
                                id="playerID"
                                type="text"
                                value={playerID}
                                onChange={(e) => setPlayerID(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="请输入玩家ID"
                                disabled={loading}
                            />
                        </div>

                        <div className="input-field">
                            <label htmlFor="gameMode">游戏模式</label>
                            <select
                                id="gameMode"
                                value={selectedMode}
                                onChange={(e) => setSelectedMode(e.target.value)}
                                disabled={loading}
                            >
                                {gameModes.map((mode) => (
                                    <option key={mode.value} value={mode.value}>
                                        {mode.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            className="query-button"
                            onClick={queryBattle}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    查询中...
                                </>
                            ) : '🔍 查询战绩'}
                        </button>
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="error-message">
                            ❌ {error}
                        </div>
                    )}
                </div>

                {/* 结果显示区域 */}
                {battleData && battleData.success && (
                    <div className="result-section">
                        {/* 修复：处理空数据情况 */}
                        {battleData.total === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📊</div>
                                <h3>{battleData.message || "暂无战绩记录"}</h3>
                                <p>该玩家在当前模式下没有游戏记录</p>
                                <div className="stats-info">
                                    <p>总场次: 0 | 胜率: 0% | 平均KDA: 0/0/0</p>
                                </div>
                                <div className="empty-tips">
                                    <p>💡 尝试：</p>
                                    <ul>
                                        <li>切换到其他游戏模式</li>
                                        <li>确认玩家ID是否正确</li>
                                        <li>该模式可能最近没有游戏记录</li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="summary-card">
                                    <h2>📊 战绩总览</h2>
                                    <div className="summary-grid">
                                        <div className="stat-item">
                                            <div className="stat-value total-games">{battleData.summary.totalGames}</div>
                                            <div className="stat-label">总场次</div>
                                        </div>

                                        <div className="stat-item">
                                            <div
                                                className="stat-value win-rate"
                                                style={{ color: getScoreColor(battleData.summary.winRate) }}
                                            >
                                                {battleData.summary.winRate}
                                            </div>
                                            <div className="stat-label">胜率</div>
                                        </div>

                                        <div className="stat-item">
                                            <div className="stat-value avg-kda">{battleData.summary.avgKDA}</div>
                                            <div className="stat-label">平均KDA</div>
                                        </div>

                                        <div className="stat-item">
                                            <div className="win-loss">
                                                <span className="wins">✓ {battleData.summary.totalWins}胜</span>
                                                <span className="losses">✗ {battleData.summary.totalLoss}负</span>
                                            </div>
                                            <div className="stat-label">胜负记录</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 最近比赛列表 */}
                                {battleData.recentGames.length > 0 ? (
                                    <div className="recent-games">
                                        <h2>📅 最近比赛 ({Math.min(battleData.recentGames.length, 100)}场)</h2>

                                        <div className="games-table">
                                            <div className="table-header">
                                                <div className="col-time">时间</div>
                                                <div className="col-hero">英雄</div>
                                                <div className="col-kda">K/D/A</div>
                                                <div className="col-score">评分</div>
                                                <div className="col-result">结果</div>
                                                <div className="col-mode">模式</div>
                                            </div>

                                            <div className="table-body">
                                                {battleData.recentGames.map((game, index) => (
                                                    <div key={index} className="table-row">
                                                        <div className="col-time">{game.time}</div>

                                                        <div className="col-hero">
                                                            <div className="hero-info">
                                                                {game.heroIcon && (
                                                                    <img
                                                                        src={game.heroIcon}
                                                                        alt={game.heroName}
                                                                        className="hero-icon"
                                                                        onError={(e) => {
                                                                            // 图片加载失败时隐藏
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                )}
                                                                <span className="hero-name">{game.heroName}</span>
                                                            </div>
                                                        </div>

                                                        <div className="col-kda">
                                                            <div className="kda-display">
                                                                <span className="kill">{game.kills}</span>
                                                                <span className="slash">/</span>
                                                                <span className="death">{game.deaths}</span>
                                                                <span className="slash">/</span>
                                                                <span className="assist">{game.assists}</span>
                                                            </div>
                                                        </div>

                                                        <div className="col-score">
                                                            <span
                                                                className="score-badge"
                                                                style={{
                                                                    backgroundColor: getScoreColor(game.score) + '20',
                                                                    color: getScoreColor(game.score)
                                                                }}
                                                            >
                                                                {game.score}
                                                            </span>
                                                        </div>

                                                        <div className="col-result">
                                                            <span className={`result-badge ${game.resultClass}`}>
                                                                {game.result}
                                                            </span>
                                                        </div>

                                                        <div className="col-mode">
                                                            <span className="mode-label">{game.mode}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="no-games-message">
                                        <div className="no-games-icon">📝</div>
                                        <h3>暂无详细比赛记录</h3>
                                        <p>虽然查询到 {battleData.total} 场总比赛，但无法获取详细对战信息</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* 无数据时的欢迎界面 */}
                {!battleData && !loading && (
                    <div className="welcome-section">
                        <div className="welcome-content">
                            <div className="welcome-icon">👑</div>
                            <h2>欢迎使用战绩查询器</h2>
                            <p>输入玩家ID，选择游戏模式，开始查询战绩</p>

                            <div className="tips">
                                <h3>💡 使用提示：</h3>
                                <ul>
                                    <li>玩家ID通常是9-10位数字</li>
                                    <li>支持按游戏模式筛选查询</li>
                                    <li>按Enter键可快速查询</li>
                                    <li>数据来源于T1QQ API，可能存在延迟</li>
                                </ul>
                            </div>

                            <div className="category-info">
                                <h4>📋 游戏模式分类说明：</h4>
                                <div className="category-list">
                                    <div className="category-item">
                                        <span className="category-dot" style={{background: '#667eea'}}></span>
                                        <span className="category-name">排位赛</span>
                                        <span className="category-desc">5v5排位、10v10排位</span>
                                    </div>
                                    <div className="category-item">
                                        <span className="category-dot" style={{background: '#10b981'}}></span>
                                        <span className="category-name">巅峰赛</span>
                                        <span className="category-desc">巅峰赛对局</span>
                                    </div>
                                    <div className="category-item">
                                        <span className="category-dot" style={{background: '#f59e0b'}}></span>
                                        <span className="category-name">匹配模式</span>
                                        <span className="category-desc">标准模式、娱乐模式等</span>
                                    </div>
                                    <div className="category-item">
                                        <span className="category-dot" style={{background: '#8b5cf6'}}></span>
                                        <span className="category-name">房间模式</span>
                                        <span className="category-desc">3v3、1v1、战队赛</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 保存弹窗 */}
                {showSaveModal && (
                    <div className="save-modal-overlay">
                        <div className="save-modal-content">
                            <h3>💾 保存玩家ID</h3>
                            <p>当前ID: <strong>{playerID}</strong></p>

                            <div className="save-input-group">
                                <label htmlFor="nicknameInput">设置备注名称:</label>
                                <input
                                    id="nicknameInput"
                                    type="text"
                                    value={saveNickname}
                                    onChange={(e) => setSaveNickname(e.target.value)}
                                    placeholder="例如: 小明/常用号/小号"
                                    autoFocus
                                    onKeyPress={(e) => e.key === 'Enter' && confirmSave()}
                                />
                            </div>

                            <div className="save-modal-actions">
                                <button
                                    className="save-cancel-btn"
                                    onClick={() => {
                                        setShowSaveModal(false);
                                        setSaveNickname('');
                                    }}
                                    disabled={isSaving}
                                >
                                    取消
                                </button>
                                <button
                                    className="save-confirm-btn"
                                    onClick={confirmSave}
                                    disabled={isSaving || !saveNickname.trim()}
                                >
                                    {isSaving ? '保存中...' : '确认保存'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 加载中状态 */}
                {loading && (
                    <div className="loading-overlay">
                        <div className="loading-content">
                            <div className="loading-spinner"></div>
                            <p>正在查询数据，请稍候...</p>
                            <p className="loading-detail">查询中: 玩家ID {playerID}</p>
                        </div>
                    </div>
                )}
            </main>

            {/* 页脚 */}
            <footer className="app-footer">
                <div className="footer-content">
                    <p>数据来源: T1QQ API | 仅供学习使用 | 更新时间: {new Date().toLocaleDateString('zh-CN')}</p>
                    <p className="footer-note">⚠️ 数据仅供参考，实际战绩以游戏内为准</p>
                </div>
            </footer>
        </div>
    );
}

export default App;