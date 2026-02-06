package main

import (
	"encoding/json"
	"fmt"
	"os"
)

// 1. 创建英雄映射结构
type HeroInfo struct {
	Ename    int    `json:"ename"`
	Cname    string `json:"cname"`
	Title    string `json:"title"`
	HeroType int    `json:"hero_type"`
}

var heroMap map[int]HeroInfo
var heroMapLoaded bool = false

// 2. 加载英雄列表函数
func loadHeroList() error {
	if heroMapLoaded {
		return nil
	}

	// 读取 heroList.json 文件
	content, err := os.ReadFile("heroList.json")
	if err != nil {
		fmt.Printf("❌ 读取 heroList.json 失败: %v\n", err)
		return err
	}

	var heroes []HeroInfo
	if err := json.Unmarshal(content, &heroes); err != nil {
		fmt.Printf("❌ 解析 heroList.json 失败: %v\n", err)
		return err
	}

	// 构建映射表
	heroMap = make(map[int]HeroInfo)
	for _, hero := range heroes {
		heroMap[hero.Ename] = hero
	}

	heroMapLoaded = true
	fmt.Printf("✅ 已加载 %d 个英雄信息\n", len(heroMap))
	return nil
}

// 3. 获取英雄名称函数（替换原来的 getHeroName）
func getHeroName(heroId int) string {
	// 先尝试加载英雄列表
	if err := loadHeroList(); err != nil {
		// 加载失败时使用备用映射
		return getHeroNameFallback(heroId)
	}

	if hero, exists := heroMap[heroId]; exists {
		return hero.Cname
	}

	// 没找到时返回备用名称
	return getHeroNameFallback(heroId)
}

// 4. 备用映射（当json文件读取失败时使用）
func getHeroNameFallback(heroId int) string {
	fallbackMap := map[int]string{
		505: "瑶",
		155: "马可波罗",
		196: "诸葛亮",
		119: "干将莫邪",
		184: "蔡文姬",
		503: "海月",
		117: "钟无艳",
		585: "元流之子(辅助)",
		188: "大禹",
		// 可以继续添加更多
	}

	if name, exists := fallbackMap[heroId]; exists {
		return name
	}
	return fmt.Sprintf("未知英雄(%d)", heroId)
}

// 5. 新增：获取英雄详细信息（供前端使用）
func (a *App) GetHeroInfo(heroId int) map[string]interface{} {
	if err := loadHeroList(); err != nil {
		return map[string]interface{}{
			"id":   heroId,
			"name": getHeroNameFallback(heroId),
			"type": "unknown",
		}
	}

	if hero, exists := heroMap[heroId]; exists {
		// 将英雄类型转换为文字
		heroTypeText := getHeroTypeText(hero.HeroType)

		return map[string]interface{}{
			"id":       heroId,
			"name":     hero.Cname,
			"title":    hero.Title,
			"type":     heroTypeText,
			"fullName": fmt.Sprintf("%s - %s", hero.Cname, hero.Title),
		}
	}

	return map[string]interface{}{
		"id":   heroId,
		"name": getHeroNameFallback(heroId),
		"type": "unknown",
	}
}

// 6. 英雄类型映射
func getHeroTypeText(heroType int) string {
	typeMap := map[int]string{
		1: "坦克",
		2: "战士",
		3: "刺客",
		4: "法师",
		5: "射手",
		6: "辅助",
	}
	if text, exists := typeMap[heroType]; exists {
		return text
	}
	return "未知类型"
}
