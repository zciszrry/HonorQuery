import { useState } from 'react';
import './App.css';
import BattleResult from './BattleResult';
import { QueryBattleData } from "../wailsjs/go/main/App";

function App() {
    const [apiKey, setApiKey] = useState('jIKCLnXuixWwVzS4usxk3wSiYc');
    const [playerID, setPlayerID] = useState('409903972');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [battleData, setBattleData] = useState<any>(null);

    const handleQuery = async () => {
        if (!apiKey.trim() || !playerID.trim()) {
            setError('请输入API密钥和玩家ID');
            return;
        }

        setLoading(true);
        setError('');
        setBattleData(null);

        try {
            const result = await QueryBattleData(apiKey, playerID);
            if (result.success) {
                setBattleData(result);
            } else {
                setError('查询失败，请检查API密钥和玩家ID');
            }
        } catch (err: any) {
            setError(err.message || '网络请求失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app">
            <header className="header">
                <h1>🎮 王者荣耀战绩查询</h1>
                <p>快速查询玩家战绩，分析游戏数据</p>
            </header>

            <div className="main-content">
                {/* 查询面板 */}
                <div className="query-panel">
                    <div className="input-group">
                        <div className="input-field">
                            <label>API 密钥</label>
                            <input
                                type="text"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="输入API密钥"
                            />
                        </div>

                        <div className="input-field">
                            <label>玩家 ID</label>
                            <input
                                type="text"
                                value={playerID}
                                onChange={(e) => setPlayerID(e.target.value)}
                                placeholder="输入玩家ID"
                                onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
                            />
                        </div>

                        <button
                            className="query-btn"
                            onClick={handleQuery}
                            disabled={loading}
                        >
                            {loading ? '查询中...' : '查询战绩'}
                        </button>
                    </div>

                    {error && <div className="error">{error}</div>}
                </div>

                {/* 结果显示 */}
                <div className="result-container">
                    {loading || battleData ? (
                        <BattleResult
                            data={battleData}
                            loading={loading}
                        />
                    ) : (
                        <div className="welcome">
                            <div className="welcome-icon">👑</div>
                            <h2>欢迎使用战绩查询器</h2>
                            <p>输入API密钥和玩家ID开始查询</p>
                        </div>
                    )}
                </div>
            </div>

            <footer className="footer">
                <p>© 2024 王者荣耀战绩查询器 | 数据仅供参考</p>
            </footer>
        </div>
    );
}

export default App;