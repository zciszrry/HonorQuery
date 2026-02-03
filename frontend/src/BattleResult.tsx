import React from 'react';
import './BattleResult.css';

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

interface BattleData {
    success: boolean;
    total: number;
    summary: {
        totalGames: number;
        winRate: string;
        avgKDA: string;
        totalWins: number;
        totalLoss: number;
    };
    recentGames: GameRecord[];
    allRecords?: any[];
}

interface Props {
    data: BattleData;
    loading?: boolean;
}

const BattleResult: React.FC<Props> = ({ data, loading = false }) => {
    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner-large"></div>
                <p>正在加载战绩数据...</p>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    const { summary, recentGames } = data;

    return (
        <div className="battle-result">
            {/* 摘要卡片 */}
            <div className="summary-section">
                <div className="summary-card">
                    <div className="summary-header">
                        <h3>📊 战绩总览</h3>
                        <span className="total-games">共 {summary.totalGames} 场</span>
                    </div>

                    <div className="summary-stats">
                        <div className="stat-item">
                            <div className="stat-value win-rate">{summary.winRate}</div>
                            <div className="stat-label">胜率</div>
                        </div>

                        <div className="stat-item">
                            <div className="stat-value kda">{summary.avgKDA}</div>
                            <div className="stat-label">平均KDA</div>
                        </div>

                        <div className="stat-item">
                            <div className="win-loss">
                                <span className="wins">✓ {summary.totalWins}胜</span>
                                <span className="losses">✗ {summary.totalLoss}负</span>
                            </div>
                            <div className="stat-label">胜负记录</div>
                        </div>
                    </div>

                    <div className="kda-breakdown">
                        <div className="kda-item">
                            <span className="kda-label">击杀</span>
                            <div className="kda-bar">
                                <div className="kda-fill kills"></div>
                            </div>
                        </div>
                        <div className="kda-item">
                            <span className="kda-label">死亡</span>
                            <div className="kda-bar">
                                <div className="kda-fill deaths"></div>
                            </div>
                        </div>
                        <div className="kda-item">
                            <span className="kda-label">助攻</span>
                            <div className="kda-bar">
                                <div className="kda-fill assists"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 最近比赛列表 */}
            <div className="recent-games-section">
                <div className="section-header">
                    <h3>📅 最近比赛记录</h3>
                    <span className="game-count">最近 {recentGames.length} 场</span>
                </div>

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
                        {recentGames.map((game, index) => (
                            <div key={index} className="table-row">
                                <div className="col-time">{game.time}</div>

                                <div className="col-hero">
                                    <div className="hero-info">
                                        {game.heroIcon && (
                                            <img
                                                src={game.heroIcon}
                                                alt={game.heroName}
                                                className="hero-avatar"
                                            />
                                        )}
                                        <span className="hero-name">{game.heroName}</span>
                                    </div>
                                </div>

                                <div className="col-kda">
                                    <div className="kda-numbers">
                                        <span className="kill">{game.kills}</span>
                                        <span className="separator">/</span>
                                        <span className="death">{game.deaths}</span>
                                        <span className="separator">/</span>
                                        <span className="assist">{game.assists}</span>
                                    </div>
                                </div>

                                <div className="col-score">
                                    <div className={`score-badge score-${Math.floor(parseFloat(game.score))}`}>
                                        {game.score}
                                    </div>
                                </div>

                                <div className="col-result">
                                    <div className={`result-badge ${game.resultClass}`}>
                                        {game.result}
                                    </div>
                                </div>

                                <div className="col-mode">
                                    <span className="mode-tag">{game.mode}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 数据统计 */}
            <div className="stats-section">
                <h3>📈 详细统计</h3>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">🎯</div>
                        <div className="stat-content">
                            <div className="stat-title">最高评分</div>
                            <div className="stat-value">
                                {Math.max(...recentGames.map(g => parseFloat(g.score) || 0)).toFixed(1)}
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">⚔️</div>
                        <div className="stat-content">
                            <div className="stat-title">平均击杀</div>
                            <div className="stat-value">
                                {(recentGames.reduce((sum, g) => sum + g.kills, 0) / recentGames.length).toFixed(1)}
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">💀</div>
                        <div className="stat-content">
                            <div className="stat-title">平均死亡</div>
                            <div className="stat-value">
                                {(recentGames.reduce((sum, g) => sum + g.deaths, 0) / recentGames.length).toFixed(1)}
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">🤝</div>
                        <div className="stat-content">
                            <div className="stat-title">平均助攻</div>
                            <div className="stat-value">
                                {(recentGames.reduce((sum, g) => sum + g.assists, 0) / recentGames.length).toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BattleResult;