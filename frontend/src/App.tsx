import React, { useState, useEffect } from 'react';
import './App.css';
import { QueryBattleData, GetGameModes } from "../wailsjs/go/main/App";

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
    const [playerID, setPlayerID] = useState("409903972");
    const [selectedMode, setSelectedMode] = useState("0");
    const [gameModes, setGameModes] = useState<Array<{value: string, label: string}>>([]);
    const [loading, setLoading] = useState(false);
    const [battleData, setBattleData] = useState<BattleData | null>(null);
    const [error, setError] = useState<string>("");

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

    return (
        <div className="app-container">
            {/* 头部 */}
            <header className="app-header">
                <h1>🎮 王者荣耀战绩查询</h1>
                <p className="subtitle">快速查询玩家战绩数据</p>
            </header>

            {/* 主内容 */}
            <main className="app-main">
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
                        {/* 数据摘要 */}
                        {battleData.message ? (
                            <div className="empty-state">
                                <div className="empty-icon">📊</div>
                                <h3>{battleData.message}</h3>
                                <p>请尝试其他玩家ID或游戏模式</p>
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
                                {battleData.recentGames.length > 0 && (
                                    <div className="recent-games">
                                        <h2>📅 最近比赛 ({battleData.recentGames.length}场)</h2>

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
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* 页脚 */}
            <footer className="app-footer">
                <p>数据来源: T1QQ API | 仅供学习使用</p>
            </footer>
        </div>
    );
}

export default App;