package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// 创建应用实例
	app := NewApp()

	// 运行应用
	err := wails.Run(&options.App{
		Title:     "王者荣耀战绩查询器",
		Width:     1200,
		Height:    800,
		MinWidth:  800,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
		// 窗口功能
		Frameless:         false,
		StartHidden:       false,
		HideWindowOnClose: false,
		// CSS 主题
		CSSDragProperty: "--wails-draggable",
		CSSDragValue:    "drag",
		// 调试模式
		Debug: options.Debug{
			OpenInspectorOnStartup: false,
		},
	})

	if err != nil {
		log.Fatal("应用启动失败:", err)
	}
}
