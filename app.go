package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// App 结构体
type App struct {
	ctx context.Context
}

// 响应数据结构
type BattleResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		List []BattleRecord `json:"list"`
	} `json:"data"`
}

// 战绩记录结构
type BattleRecord struct {
	DtEventTime string `json:"dtEventTime"`
	GameTime    string `json:"gametime"`
	KillCnt     int    `json:"killcnt"`
	DeadCnt     int    `json:"deadcnt"`
	AssistCnt   int    `json:"assistcnt"`
	GameResult  int    `json:"gameresult"`
	HeroId      int    `json:"heroId"`
	MapName     string `json:"mapName"`
	GradeGame   string `json:"gradeGame"`
	HeroIcon    string `json:"heroIcon"`
	RoleJobName string `json:"roleJobName"`
	Stars       int    `json:"stars"`
}

// NewApp 创建应用实例
func NewApp() *App {
	return &App{}
}

// Startup 应用启动
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ================ 核心 API 函数 ================

// QueryBattleData 查询战绩数据（前端调用）
func (a *App) QueryBattleData(apiKey string, playerID string) (map[string]interface{}, error) {
	// 构建请求URL
	url := fmt.Sprintf("https://api.t1qq.com/api/tool/wzrr/morebattle?key=%s&id=%s", apiKey, playerID)

	// 发送HTTP请求
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()

	// 解析响应
	var result BattleResponse
	decoder := json.NewDecoder(resp.Body)
	if err := decoder.Decode(&result); err != nil {
		return nil, fmt.Errorf("解析失败: %v", err)
	}

	// 检查API状态
	if result.Code != 200 {
		return nil, fmt.Errorf("API错误: %s", result.Msg)
	}

	// 分析数据
	records := result.Data.List
	summary := analyzeSummary(records)
	recentGames := getRecentGames(records, 10)

	// 返回给前端的数据
	return map[string]interface{}{
		"success":     true,
		"total":       len(records),
		"summary":     summary,
		"recentGames": recentGames,
		"allRecords":  records,
	}, nil
}

// analyzeSummary 分析总结数据
func analyzeSummary(records []BattleRecord) map[string]interface{} {
	if len(records) == 0 {
		return map[string]interface{}{
			"totalGames": 0,
			"winRate":    0,
			"avgKDA":     "0/0/0",
		}
	}

	total := len(records)
	wins := 0
	totalK, totalD, totalA := 0, 0, 0

	for _, r := range records {
		if r.GameResult == 1 {
			wins++
		}
		totalK += r.KillCnt
		totalD += r.DeadCnt
		totalA += r.AssistCnt
	}

	winRate := float64(wins) / float64(total) * 100
	avgK := float64(totalK) / float64(total)
	avgD := float64(totalD) / float64(total)
	avgA := float64(totalA) / float64(total)

	return map[string]interface{}{
		"totalGames": total,
		"winRate":    fmt.Sprintf("%.1f%%", winRate),
		"avgKDA":     fmt.Sprintf("%.1f/%.1f/%.1f", avgK, avgD, avgA),
		"totalWins":  wins,
		"totalLoss":  total - wins,
	}
}

// getRecentGames 获取最近比赛
func getRecentGames(records []BattleRecord, count int) []map[string]interface{} {
	if count > len(records) {
		count = len(records)
	}

	var recent []map[string]interface{}
	for i := 0; i < count; i++ {
		r := records[i]
		resultText := "失败"
		resultClass := "lose"
		if r.GameResult == 1 {
			resultText = "胜利"
			resultClass = "win"
		}

		recent = append(recent, map[string]interface{}{
			"index":       i + 1,
			"time":        r.GameTime,
			"heroId":      r.HeroId,
			"heroName":    getHeroName(r.HeroId),
			"heroIcon":    r.HeroIcon,
			"kda":         fmt.Sprintf("%d/%d/%d", r.KillCnt, r.DeadCnt, r.AssistCnt),
			"kills":       r.KillCnt,
			"deaths":      r.DeadCnt,
			"assists":     r.AssistCnt,
			"score":       r.GradeGame,
			"result":      resultText,
			"resultClass": resultClass,
			"mode":        r.MapName,
		})
	}

	return recent
}

// getHeroName 获取英雄名称
func getHeroName(heroId int) string {
	heroMap := map[int]string{
		505: "瑶",
		155: "马可波罗",
		196: "诸葛亮",
		119: "干将莫邪",
		184: "蔡文姬",
		503: "海月",
		117: "钟无艳",
	}

	if name, exists := heroMap[heroId]; exists {
		return name
	}
	return fmt.Sprintf("未知英雄(%d)", heroId)
}
