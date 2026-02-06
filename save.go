package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"time"
)

// 1. ID存储结构
type SavedPlayer struct {
	ID       string `json:"id"`
	Nickname string `json:"nickname"`
	SaveTime int64  `json:"save_time"`
	LastUsed int64  `json:"last_used"`
}

// 2. 保存玩家ID
func (a *App) SavePlayerID(playerID string, nickname string) (bool, error) {
	// 读取现有保存的ID
	savedPlayers := a.loadSavedPlayers()

	// 检查是否已存在
	for i, player := range savedPlayers {
		if player.ID == playerID {
			// 更新备注
			savedPlayers[i].Nickname = nickname
			savedPlayers[i].LastUsed = time.Now().Unix()
			return a.savePlayersToFile(savedPlayers), nil
		}
	}

	// 新增保存
	newPlayer := SavedPlayer{
		ID:       playerID,
		Nickname: nickname,
		SaveTime: time.Now().Unix(),
		LastUsed: time.Now().Unix(),
	}
	savedPlayers = append(savedPlayers, newPlayer)

	return a.savePlayersToFile(savedPlayers), nil
}

// 3. 获取所有保存的玩家
func (a *App) GetSavedPlayers() []SavedPlayer {
	return a.loadSavedPlayers()
}

// 4. 删除保存的玩家
func (a *App) RemoveSavedPlayer(playerID string) bool {
	savedPlayers := a.loadSavedPlayers()
	newPlayers := []SavedPlayer{}

	for _, player := range savedPlayers {
		if player.ID != playerID {
			newPlayers = append(newPlayers, player)
		}
	}

	return a.savePlayersToFile(newPlayers)
}

// 5. 加载保存的玩家数据
// 修改 loadSavedPlayers 函数，添加路径信息
func (a *App) loadSavedPlayers() []SavedPlayer {
	// 获取当前工作目录
	cwd, _ := os.Getwd()
	fmt.Printf("📁 当前工作目录: %s\n", cwd)

	// 尝试多个可能的路径
	possiblePaths := []string{
		"saved_players.json",
		"./saved_players.json",
		"data/saved_players.json",
		"./data/saved_players.json",
	}

	for _, path := range possiblePaths {
		fmt.Printf("🔍 尝试读取: %s\n", path)
		data, err := os.ReadFile(path)
		if err == nil {
			fmt.Printf("✅ 从 %s 读取成功\n", path)
			var players []SavedPlayer
			if err := json.Unmarshal(data, &players); err != nil {
				fmt.Printf("❌ 解析保存文件失败: %v\n", err)
				return []SavedPlayer{}
			}
			fmt.Printf("📊 加载了 %d 个玩家\n", len(players))
			return players
		}
	}

	fmt.Println("⚠️ 没有找到保存文件，返回空数组")
	return []SavedPlayer{}
}

// 6. 保存到文件
func (a *App) savePlayersToFile(players []SavedPlayer) bool {
	// 按最后使用时间排序
	sort.Slice(players, func(i, j int) bool {
		return players[i].LastUsed > players[j].LastUsed
	})

	data, err := json.MarshalIndent(players, "", "  ")
	if err != nil {
		fmt.Printf("❌ 序列化保存数据失败: %v\n", err)
		return false
	}

	err = os.WriteFile("saved_players.json", data, 0644)
	if err != nil {
		fmt.Printf("❌ 写入保存文件失败: %v\n", err)
		return false
	}

	return true
}
