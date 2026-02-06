package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
)

// 嵌入 heroList.json 文件
//
//go:embed herolist.json
var heroListData []byte

// 1. 创建英雄映射结构
type HeroInfo struct {
	Ename    int    `json:"ename"`
	Cname    string `json:"cname"`
	Title    string `json:"title"`
	HeroType int    `json:"hero_type"`
}

var heroMap map[int]HeroInfo
var heroMapLoaded bool = false

// 2. 加载英雄列表函数（从嵌入数据加载）
func loadHeroList() error {
	if heroMapLoaded {
		return nil
	}

	var heroes []HeroInfo
	if err := json.Unmarshal(heroListData, &heroes); err != nil {
		fmt.Printf("❌ 解析英雄列表失败: %v\n", err)
		heroMap = make(map[int]HeroInfo)
		heroMapLoaded = true
		return err
	}

	// 构建映射表
	heroMap = make(map[int]HeroInfo)
	for _, hero := range heroes {
		heroMap[hero.Ename] = hero
	}

	heroMapLoaded = true
	return nil
}

// 3. 获取英雄名称函数
func getHeroName(heroId int) string {
	if err := loadHeroList(); err != nil {
		return fmt.Sprintf("未知英雄(%d)", heroId)
	}

	if hero, exists := heroMap[heroId]; exists {
		return hero.Cname
	}

	return fmt.Sprintf("未知英雄(%d)", heroId)
}

// 4. 获取英雄详细信息
func (a *App) GetHeroInfo(heroId int) map[string]interface{} {
	if err := loadHeroList(); err != nil {
		return map[string]interface{}{
			"id":   heroId,
			"name": fmt.Sprintf("未知英雄(%d)", heroId),
			"type": "unknown",
		}
	}

	if hero, exists := heroMap[heroId]; exists {
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
		"name": fmt.Sprintf("未知英雄(%d)", heroId),
		"type": "unknown",
	}
}

// 5. 英雄类型映射
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
