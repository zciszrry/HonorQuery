package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"
)

// 嵌入初始的 saved_players.json 文件
//
//go:embed saved_players.json
var defaultSavedPlayersData []byte

// 1. ID存储结构
type SavedPlayer struct {
	ID       string `json:"id"`
	Nickname string `json:"nickname"`
	SaveTime int64  `json:"save_time"`
	LastUsed int64  `json:"last_used"`
}

// 获取用户数据目录的路径
func (a *App) getUserDataPath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		// 如果获取失败，使用当前目录
		return "."
	}

	// 创建应用专属目录
	appDir := filepath.Join(configDir, "王者荣耀战绩查询")
	os.MkdirAll(appDir, 0755)
	return appDir
}

// 获取用户数据文件路径
func (a *App) getUserDataFilePath() string {
	return filepath.Join(a.getUserDataPath(), "saved_players.json")
}

// 初始化用户数据文件（第一次运行时调用）
func (a *App) initUserDataFile() error {
	userFilePath := a.getUserDataFilePath()

	// 检查文件是否已存在
	if _, err := os.Stat(userFilePath); err == nil {
		// 文件已存在，不需要初始化
		return nil
	}

	// 文件不存在，从嵌入数据复制
	fmt.Printf("🔄 初始化用户数据文件: %s\n", userFilePath)

	// 首先尝试读取嵌入的默认数据
	if len(defaultSavedPlayersData) > 0 {
		// 直接复制嵌入数据到用户目录
		if err := os.WriteFile(userFilePath, defaultSavedPlayersData, 0644); err == nil {
			fmt.Printf("✅ 已从嵌入数据复制默认玩家列表\n")
			return nil
		}
	}

	// 如果嵌入数据无效或复制失败，创建包含默认数据的文件
	defaultPlayers := []SavedPlayer{
		{
			ID:       "409903972",
			Nickname: "示例玩家",
			SaveTime: time.Now().Unix(),
			LastUsed: time.Now().Unix(),
		},
	}

	data, err := json.MarshalIndent(defaultPlayers, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(userFilePath, data, 0644)
}

// 2. 保存玩家ID
func (a *App) SavePlayerID(playerID string, nickname string) (bool, error) {
	// 确保用户数据文件已初始化
	if err := a.initUserDataFile(); err != nil {
		fmt.Printf("❌ 初始化用户数据文件失败: %v\n", err)
		return false, err
	}

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
	// 确保用户数据文件已初始化
	a.initUserDataFile()
	return a.loadSavedPlayers()
}

// 4. 删除保存的玩家
func (a *App) RemoveSavedPlayer(playerID string) bool {
	// 确保用户数据文件已初始化
	if err := a.initUserDataFile(); err != nil {
		fmt.Printf("❌ 初始化用户数据文件失败: %v\n", err)
		return false
	}

	savedPlayers := a.loadSavedPlayers()
	newPlayers := []SavedPlayer{}

	for _, player := range savedPlayers {
		if player.ID != playerID {
			newPlayers = append(newPlayers, player)
		}
	}

	return a.savePlayersToFile(newPlayers)
}

// 5. 加载保存的玩家数据（修改为使用用户数据目录）
func (a *App) loadSavedPlayers() []SavedPlayer {
	userFilePath := a.getUserDataFilePath()

	data, err := os.ReadFile(userFilePath)
	if err != nil {
		fmt.Printf("❌ 读取用户数据文件失败: %v\n", err)
		return []SavedPlayer{}
	}

	var players []SavedPlayer
	if err := json.Unmarshal(data, &players); err != nil {
		fmt.Printf("❌ 解析用户数据文件失败: %v\n", err)
		return []SavedPlayer{}
	}

	return players
}

// 6. 保存到文件（修改为保存到用户数据目录）
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

	userFilePath := a.getUserDataFilePath()
	err = os.WriteFile(userFilePath, data, 0644)
	if err != nil {
		fmt.Printf("❌ 写入用户数据文件失败: %v\n", err)
		return false
	}

	return true
}
