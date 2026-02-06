package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
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
	GameSeq     string `json:"gameSeq"`
	BattleType  int    `json:"battleType"`
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
// 保持原函数名，更新实现为五分类
func (a *App) QueryBattleData(apiKey string, playerID string, category string) (map[string]interface{}, error) {
	// 五分类映射（修正版）
	categoryMap := map[string][]string{
		"1": {"0"},                           // 1.全部
		"2": {"1", "16"},                     // 2.排位（只包含纯排位）
		"3": {"4"},                           // 3.巅峰
		"4": {"2", "7", "3", "5", "6", "17"}, // 4.匹配（排除排位，实测option=2和7包含非排位）
		"5": {"8", "9", "10"},                // 5.房间
	}

	// 获取对应模式列表
	modes := categoryMap["1"]
	if m, exists := categoryMap[category]; exists {
		modes = m
	}

	fmt.Printf("🔍 查询分类: %s → 模式: %v\n", category, modes)

	// 使用Set去重（基于游戏序列号gameSeq）
	seenGames := make(map[string]bool)
	allRecords := []BattleRecord{}

	// 并发获取所有模式数据
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, mode := range modes {
		wg.Add(1)
		go func(modeStr string) {
			defer wg.Done()

			url := fmt.Sprintf("https://api.t1qq.com/api/tool/wzrr/morebattle?key=%s&id=%s&option=%s",
				apiKey, playerID, modeStr)

			client := &http.Client{Timeout: 30 * time.Second}
			resp, err := client.Get(url)
			if err != nil {
				fmt.Printf("❌ 模式 %s 查询失败: %v\n", modeStr, err)
				return
			}
			defer resp.Body.Close()

			// 读取响应
			bodyBytes, err := io.ReadAll(resp.Body)
			if err != nil {
				fmt.Printf("❌ 模式 %s 读取失败: %v\n", modeStr, err)
				return
			}

			var result BattleResponse
			if err := json.Unmarshal(bodyBytes, &result); err != nil {
				fmt.Printf("❌ 模式 %s 解析失败: %v\n", modeStr, err)
				return
			}

			if result.Code == 200 {
				mu.Lock()
				// 去重逻辑
				for _, record := range result.Data.List {
					// 使用gameSeq作为唯一标识
					if record.GameSeq != "" {
						if !seenGames[record.GameSeq] {
							seenGames[record.GameSeq] = true
							// 修正：根据模式值过滤排位数据
							// 如果当前是匹配模式，但record是排位，跳过
							if category == "4" && isRankedGame(record) {
								continue
							}
							if category == "4" && isTopGame(record) {
								continue
							}
							allRecords = append(allRecords, record)
						}
					} else {
						// 没有gameSeq时用时间+英雄ID作为备用标识
						key := fmt.Sprintf("%s-%d", record.DtEventTime, record.HeroId)
						if !seenGames[key] {
							seenGames[key] = true
							if category == "4" && isRankedGame(record) {
								continue
							}
							if category == "4" && isTopGame(record) {
								continue
							}
							allRecords = append(allRecords, record)
						}
					}
				}
				mu.Unlock()
				fmt.Printf("✅ 模式 %s 获取到 %d 条记录（去重后新增%d条）\n",
					modeStr, len(result.Data.List), len(result.Data.List))
			} else {
				fmt.Printf("⚠️ 模式 %s API错误: %s\n", modeStr, result.Msg)
			}
		}(mode)
	}

	wg.Wait()

	// 按时间倒序排序
	sort.Slice(allRecords, func(i, j int) bool {
		return allRecords[i].DtEventTime > allRecords[j].DtEventTime
	})

	fmt.Printf("🎯 总计获取 %d 条记录（已去重）\n", len(allRecords))

	// 修复：允许空数据
	if len(allRecords) == 0 {
		return map[string]interface{}{
			"success":  true,
			"category": category,
			"total":    0,
			"summary": map[string]interface{}{
				"totalGames": 0,
				"winRate":    "0%",
				"avgKDA":     "0/0/0",
				"totalWins":  0,
				"totalLoss":  0,
			},
			"recentGames": []interface{}{},
			"message":     fmt.Sprintf("该玩家在%s模式下暂无战绩记录", getCategoryName(category)),
		}, nil
	}

	// 分析数据
	summary := analyzeSummary(allRecords)
	recentGames := getRecentGames(allRecords, len(allRecords))

	return map[string]interface{}{
		"success":     true,
		"category":    category,
		"total":       len(allRecords),
		"summary":     summary,
		"recentGames": recentGames,
		"modesCount":  len(modes),
	}, nil
}

// 判断是否为排位赛
func isRankedGame(record BattleRecord) bool {
	// 根据原始API返回的battleType或mapName判断
	return record.MapName == "排位赛" ||
		strings.Contains(record.MapName, "排位") ||
		record.BattleType == 12 || // 双排
		record.BattleType == 13 || // 三排
		record.BattleType == 15 || // 五排
		record.BattleType == 16 // 单排
}

// 判断是否为巅峰赛
func isTopGame(record BattleRecord) bool {
	// 根据原始API返回的battleType或mapName判断
	return record.MapName == "巅峰赛" ||
		strings.Contains(record.MapName, "巅峰")
}

// 获取分类名称
func getCategoryName(category string) string {
	names := map[string]string{
		"1": "全部比赛",
		"2": "排位赛",
		"3": "巅峰赛",
		"4": "匹配模式",
		"5": "房间模式",
	}
	return names[category]
}

// 修正analyzeSummary函数，处理空数据
func analyzeSummary(records []BattleRecord) map[string]interface{} {
	if len(records) == 0 {
		return map[string]interface{}{
			"totalGames": 0,
			"winRate":    "0%",
			"avgKDA":     "0/0/0",
			"totalWins":  0,
			"totalLoss":  0,
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

// 更新GetGameModes返回五分类选项
func (a *App) GetGameModes() []map[string]interface{} {
	return []map[string]interface{}{
		{"value": "1", "label": "全部比赛"},
		{"value": "2", "label": "排位赛"},
		{"value": "3", "label": "巅峰赛"},
		{"value": "4", "label": "匹配模式"},
		{"value": "5", "label": "房间模式"},
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
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

// 新增函数：五分类查询
func (a *App) GetBattleData(apiKey string, playerID string, category string) (map[string]interface{}, error) {
	// 五分类映射
	categoryMap := map[string][]string{
		"1": {"0"},                           // 1.全部
		"2": {"1", "16"},                     // 2.排位：5v5排位 + 10v10排位
		"3": {"4"},                           // 3.巅峰：巅峰赛
		"4": {"2", "3", "5", "6", "7", "17"}, // 4.匹配：标准+娱乐+五军+边境+5v5+10v10
		"5": {"8", "9", "10"},                // 5.房间：3v3 + 1v1 + 战队赛
	}

	// 默认查询全部
	modes := categoryMap["1"]
	if m, exists := categoryMap[category]; exists {
		modes = m
	}

	// 获取所有数据
	allRecords := []BattleRecord{}
	for _, mode := range modes {
		url := fmt.Sprintf("https://api.t1qq.com/api/tool/wzrr/morebattle?key=%s&id=%s&option=%s",
			apiKey, playerID, mode)

		// 发送请求并解析
		records, err := a.fetchBattleData(url)
		if err == nil {
			allRecords = append(allRecords, records...)
		}
	}

	// 分析数据
	summary := analyzeSummary(allRecords)
	recentGames := getRecentGames(allRecords, len(allRecords))

	return map[string]interface{}{
		"success":     true,
		"category":    category,
		"total":       len(allRecords),
		"summary":     summary,
		"recentGames": recentGames,
		"modesCount":  len(modes), // 包含几个mode
	}, nil
}

// 新增：五分类选项
func (a *App) GetCategoryOptions() []map[string]interface{} {
	return []map[string]interface{}{
		{"value": "1", "label": "全部比赛"},
		{"value": "2", "label": "排位赛"},
		{"value": "3", "label": "巅峰赛"},
		{"value": "4", "label": "匹配模式"},
		{"value": "5", "label": "房间模式"},
	}
}

// 辅助函数：获取单模式数据
func (a *App) fetchBattleData(url string) ([]BattleRecord, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result BattleResponse
	decoder := json.NewDecoder(resp.Body)
	if err := decoder.Decode(&result); err != nil {
		return nil, err
	}

	if result.Code != 200 {
		return nil, fmt.Errorf("API错误: %s", result.Msg)
	}

	return result.Data.List, nil
}
