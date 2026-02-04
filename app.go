package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
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
func (a *App) QueryBattleData(apiKey string, playerID string, mode string) (map[string]interface{}, error) {
	// 添加调试信息
	fmt.Printf("🔍 开始查询 - 玩家ID: %s, 模式: %s\n", playerID, mode)

	// 构建URL
	url := fmt.Sprintf("https://api.t1qq.com/api/tool/wzrr/morebattle?key=%s&id=%s&option=%s",
		apiKey, playerID, mode)

	fmt.Printf("🌐 请求URL: %s\n", url)

	// 发送请求
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		errorMsg := fmt.Sprintf("网络请求失败: %v", err)
		fmt.Println("❌", errorMsg)
		return map[string]interface{}{
			"success": false,
			"message": errorMsg,
			"debug":   map[string]interface{}{"url": url, "error": err.Error()},
		}, nil
	}
	defer resp.Body.Close()

	fmt.Printf("✅ HTTP状态码: %d\n", resp.StatusCode)

	// 读取响应体（先读出来查看）
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		errorMsg := fmt.Sprintf("读取响应失败: %v", err)
		fmt.Println("❌", errorMsg)
		return map[string]interface{}{
			"success": false,
			"message": errorMsg,
		}, nil
	}

	// 打印原始响应（调试用）
	fmt.Printf("📄 原始响应: %s\n", string(bodyBytes[:min(500, len(bodyBytes))]))

	// 解析JSON
	var result BattleResponse
	err = json.Unmarshal(bodyBytes, &result)
	if err != nil {
		errorMsg := fmt.Sprintf("JSON解析失败: %v", err)
		fmt.Println("❌", errorMsg)
		return map[string]interface{}{
			"success":     false,
			"message":     errorMsg,
			"rawResponse": string(bodyBytes),
		}, nil
	}

	fmt.Printf("📊 API返回: code=%d, msg=%s, 记录数=%d\n",
		result.Code, result.Msg, len(result.Data.List))

	// 检查API状态
	if result.Code != 200 {
		errorMsg := fmt.Sprintf("API错误: %s (code: %d)", result.Msg, result.Code)
		fmt.Println("❌", errorMsg)
		return map[string]interface{}{
			"success": false,
			"message": errorMsg,
			"code":    result.Code,
		}, nil
	}

	// 分析数据
	records := result.Data.List
	summary := analyzeSummary(records)
	recentGames := getRecentGames(records, 10)

	fmt.Printf("🎯 分析完成: 总场次=%d, 胜率=%s\n",
		summary["totalGames"].(int), summary["winRate"])

	// 返回给前端的数据
	return map[string]interface{}{
		"success":     true,
		"total":       len(records),
		"summary":     summary,
		"recentGames": recentGames,
		"allRecords":  records,
		"debug":       map[string]interface{}{"apiCode": result.Code, "apiMsg": result.Msg},
	}, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
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

// 获取模式选项（供前端使用）
func (a *App) GetGameModes() []map[string]interface{} {
	return []map[string]interface{}{
		{"value": "0", "label": "全部比赛"},
		{"value": "1", "label": "5v5排位赛"},
		{"value": "16", "label": "10v10排位赛"},
		{"value": "2", "label": "5v5标准模式"},
		{"value": "17", "label": "10v10标准模式"},
		{"value": "3", "label": "娱乐模式"},
		{"value": "4", "label": "巅峰赛"},
		{"value": "5", "label": "五军对决"},
		{"value": "6", "label": "边境突围"},
		{"value": "7", "label": "5v5"},
		{"value": "8", "label": "3v3"},
		{"value": "9", "label": "1v1"},
		{"value": "10", "label": "战队赛"},
	}
}
