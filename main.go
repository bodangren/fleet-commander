package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/conductor/fleet-commander/internal/config"
	"github.com/conductor/fleet-commander/internal/database"
	"github.com/conductor/fleet-commander/internal/dispatcher"
	"github.com/conductor/fleet-commander/internal/executor"
	"github.com/conductor/fleet-commander/internal/hub"
	"github.com/conductor/fleet-commander/internal/logs"
	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/orchestrator"
	"github.com/conductor/fleet-commander/internal/parser"
	"github.com/conductor/fleet-commander/internal/registry"
	"github.com/conductor/fleet-commander/internal/watcher"
)

type HealthResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// applyConfigToRuntime applies saved config to running services without restart.
func applyConfigToRuntime(cfg *config.AppConfig, projectLoggers map[string]*logs.Logger, management *managementAPI) {
	// Update log retention on all project loggers
	retention := time.Duration(cfg.General.LogRetentionDays) * 24 * time.Hour
	for _, logger := range projectLoggers {
		logger.SetRetention(retention)
	}

	// Update harness discovery cache TTL
	cacheTTL := time.Duration(cfg.Harness.CacheTTL) * time.Second
	management.discovery.SetCacheTTL(cacheTTL)

	log.Printf("Applied config: interval=%ds retention=%ds cacheTTL=%ds wsReconnect=%dms",
		cfg.General.OrchestratorInterval, cfg.General.LogRetentionDays,
		cfg.Harness.CacheTTL, cfg.WebSocket.ReconnectInterval)
}

// DispatcherTaskSelector adapts a dispatcher.Dispatcher to orchestrator.TaskSelector.
type DispatcherTaskSelector struct {
	disp *dispatcher.Dispatcher
}

func (d *DispatcherTaskSelector) SelectTask(projectID string, project *models.Project) (*models.Task, float64, string) {
	scored, err := d.disp.GetNext(projectID)
	if err != nil || scored == nil {
		return nil, 0, ""
	}

	for _, track := range project.Tracks {
		for _, phase := range track.Phases {
			for _, task := range phase.Tasks {
				if task.ID == scored.ID {
					return task, scored.Score, scored.Rationale
				}
			}
		}
	}
	return nil, 0, ""
}

// loadProjectTracks parses tracks.md and plan.md files to populate a project's tracks.
func loadProjectTracks(pm *registry.ProjectManager, project *models.Project) {
	tracksPath := filepath.Join(project.Path, "conductor", "tracks.md")
	tracks, err := parser.ParseTracksRegistry(tracksPath)
	if err != nil {
		log.Printf("Warning: Failed to parse tracks.md for project %s: %v", project.ID, err)
		return
	}

	for _, track := range tracks {
		planPath := parser.ResolvePlanPath(project.Path, track.PlanPath)
		phases, err := parser.ParsePlan(planPath)
		if err != nil {
			log.Printf("Warning: Failed to parse plan for track %s: %v", track.ID, err)
		} else {
			track.Phases = phases
		}
	}

	project.Tracks = tracks
	project.LastUpdated = time.Now().Unix()
	pm.UpdateProject(project)
	log.Printf("Loaded %d tracks for project %s", len(tracks), project.ID)
}

func main() {
	// Handle CLI subcommands before starting the server
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "migrate":
			runMigrate()
			return
		case "validate":
			runValidate()
			return
		case "backup":
			runBackup()
			return
		case "restore":
			runRestore()
			return
		}
	}

	projectManager := registry.NewProjectManager()
	projectLoggers := make(map[string]*logs.Logger)

	watcherService, err := watcher.NewWatcherService(projectManager)
	if err != nil {
		log.Fatalf("Failed to create watcher service: %v", err)
	}
	defer watcherService.Close()

	// Load persisted projects from ~/.conductor/projects.json
	configManager, err := config.NewConfigManager()
	if err != nil {
		log.Printf("Warning: Failed to create config manager: %v", err)
	} else {
		entries, err := configManager.Load()
		if err != nil {
			log.Printf("Warning: Failed to load projects.json: %v", err)
		} else {
			for _, entry := range entries {
				p, err := projectManager.RegisterProject(entry.Path)
				if err != nil {
					log.Printf("Warning: Failed to register project %s: %v", entry.Path, err)
					continue
				}
				if err := watcherService.WatchProject(p.ID); err != nil {
					log.Printf("Warning: Failed to watch project %s: %v", p.ID, err)
				}
				projectLoggers[p.ID] = logs.NewLogger(filepath.Join(entry.Path, "conductor", "logs"), p.ID)
				loadProjectTracks(projectManager, p)
			}
		}
	}

	// Initialize SQLite database
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Fatalf("Failed to get home directory: %v", err)
	}
	dbPath := filepath.Join(homeDir, ".conductor", "fleet_commander.db")
	db, err := database.New(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()
	stores := database.NewStores(db)
	log.Printf("SQLite database initialized at %s", dbPath)

	currentDir, err := os.Getwd()
	if err != nil {
		log.Fatalf("Failed to get current directory: %v", err)
	}

	project, err := projectManager.RegisterProject(currentDir)
	if err != nil {
		log.Fatalf("Failed to register current project: %v", err)
	}

	loadProjectTracks(projectManager, project)

	err = watcherService.WatchProject(project.ID)
	if err != nil {
		log.Printf("Warning: Failed to watch conductor directory: %v", err)
	}

	watcherService.Start()

	wsHub := hub.New()
	management := newManagementAPI(currentDir)

	agentStore := management.defaultAgentStore()
	harnessStore := management.defaultHarnessStore()
	executionService := executor.NewExecutionService(wsHub, agentStore, harnessStore)

	logsDir := filepath.Join(currentDir, "conductor", "logs")
	projectLogger := logs.NewLogger(logsDir, project.ID)
	projectLoggers[project.ID] = projectLogger

	// Initialize dispatcher with scorer from DISPATCHER_SCORER env (default: priority)
	// Set DISPATCHER_SCORER=llm when an LLM client is configured for intelligent scoring.
	extractor := dispatcher.NewProjectExtractor(projectManager)
	agg := dispatcher.NewTaskAggregator(extractor)
	var scorer dispatcher.Scorer
	switch os.Getenv("DISPATCHER_SCORER") {
	case "llm":
		log.Println("LLM scorer requested but no client configured, using PriorityScorer")
		scorer = &dispatcher.PriorityScorer{}
	default:
		scorer = &dispatcher.PriorityScorer{}
	}
	disp := dispatcher.NewDispatcher(agg, scorer)
	taskSelector := &DispatcherTaskSelector{disp: disp}

	orch := orchestrator.New(projectManager,
		orchestrator.WithExecutor(executionService),
		orchestrator.WithLogger(projectLogger),
		orchestrator.WithTaskSelector(taskSelector),
		orchestrator.WithReviewRunner(&orchestrator.ReviewRunnerImpl{}),
	)

	// Auto-run orchestrator on a configurable interval
	intervalFn := func() int {
		if configManager == nil {
			return 30
		}
		cfg, err := configManager.LoadAppConfig()
		if err != nil {
			return 30
		}
		return cfg.General.OrchestratorInterval
	}
	autoRunner := orchestrator.NewAutoRunner(orch, projectManager, intervalFn)
	autoRunner.Start()
	defer autoRunner.Stop()

	// Apply persisted config to runtime services on startup
	if configManager != nil {
		if cfg, err := configManager.LoadAppConfig(); err == nil {
			applyConfigToRuntime(cfg, projectLoggers, management)
		}
	}

	mux := http.NewServeMux()
	management.register(mux)

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(HealthResponse{
			Status:  "ok",
			Message: "Conductor Fleet Commander Daemon is running.",
		})
	})

	// Project routes
	projectDeps := &ProjectDeps{
		ProjectManager: projectManager,
		ProjectLoggers: projectLoggers,
		ConfigManager:  configManager,
		Stores:         stores,
		Disp:           disp,
		Orch:           orch,
	}
	mux.HandleFunc("GET /api/projects", handleListProjects(projectDeps))
	mux.HandleFunc("GET /api/projects/{id}", handleGetProject(projectDeps))
	mux.HandleFunc("POST /api/projects/register", handleRegisterProject(projectDeps, watcherService))
	mux.HandleFunc("POST /api/projects/scan", handleScanProjects(projectDeps))
	mux.HandleFunc("POST /api/projects", handleBulkRegisterProjects(projectDeps, watcherService))
	mux.HandleFunc("GET /api/projects/{id}/next-task", handleGetNextTask(projectDeps))
	mux.HandleFunc("GET /api/projects/{id}/candidates", handleGetCandidates(projectDeps))
	mux.HandleFunc("POST /api/projects/{id}/run", handleRunProject(projectDeps))
	mux.HandleFunc("PATCH /api/projects/{id}/tasks/{taskId}", handleUpdateTask(projectDeps))

	// Other routes
	registerProjectIssueRoutes(mux, projectManager, stores)
	registerProjectLogRoutes(mux, projectManager, projectLoggers, stores)
	registerStatsRoutes(mux, stores)
	registerSprintRoutes(mux, projectManager)
	registerBackupRoutes(mux, projectManager)
	registerSprintSuggestRoutes(mux, projectManager)
	registerEstimationRoutes(mux, projectManager)
	registerDependencyRoutes(mux, projectManager)

	// Settings routes
	settingsDeps := &SettingsDeps{
		ConfigManager: configManager,
		ApplyConfig: func(cfg *config.AppConfig) {
			applyConfigToRuntime(cfg, projectLoggers, management)
		},
	}
	mux.HandleFunc("GET /api/settings", handleGetSettings(settingsDeps))
	mux.HandleFunc("PUT /api/settings", handleUpdateSettings(settingsDeps))

	// Task execution routes
	taskDeps := &TaskExecutionDeps{
		ProjectManager:   projectManager,
		ExecutionService: executionService,
		WebSocketHub:     wsHub,
	}
	mux.HandleFunc("POST /api/projects/{id}/tasks/execute", handleExecuteTask(taskDeps))
	mux.HandleFunc("POST /api/projects/{id}/tasks/stop", handleStopTask(taskDeps))
	mux.HandleFunc("/ws/output", handleWebSocketOutput(taskDeps))
	mux.HandleFunc("GET /api/projects/{id}/ws", handleProjectWebSocket(taskDeps))

	// Static file server
	frontendDir := filepath.Join(".", "frontend", "dist")
	fs := http.FileServer(http.Dir(frontendDir))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(frontendDir, r.URL.Path)
		_, err := os.Stat(path)
		if os.IsNotExist(err) || r.URL.Path == "/" {
			http.ServeFile(w, r, filepath.Join(frontendDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})

	port := "8081"
	log.Printf("Starting Conductor Fleet Commander on http://localhost:%s\n", port)
	log.Printf("Monitoring project: %s\n", currentDir)

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
