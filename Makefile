.PHONY: all build run clean dev

# Build both frontend and backend
all: build

# Build the Vite frontend and the Go daemon
build:
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Building Go daemon..."
	go build -o bin/fleet-commander main.go
	@echo "Build complete. Run bin/fleet-commander"

# Run the Go daemon (will serve whatever is in frontend/dist)
run:
	go run main.go

# Start the dev environments
# To develop the UI, run 'cd frontend && npm run dev'
# The Vite config proxies /api to localhost:8080
dev:
	@echo "Starting Go backend..."
	go run main.go &
	@echo "Starting Vite frontend..."
	cd frontend && npm run dev

# Clean up builds
clean:
	rm -rf bin/
	rm -rf frontend/dist/
