package hub

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Hub manages WebSocket client connections per project.
type Hub struct {
	mu          sync.RWMutex
	clients     map[string]map[*websocket.Conn]bool
	subscribers map[string]map[chan any]struct{}
}

// New creates a new Hub.
func New() *Hub {
	return &Hub{
		clients:     make(map[string]map[*websocket.Conn]bool),
		subscribers: make(map[string]map[chan any]struct{}),
	}
}

// Register adds a WebSocket connection to the project's client set.
func (h *Hub) Register(projectID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[projectID] == nil {
		h.clients[projectID] = make(map[*websocket.Conn]bool)
	}
	h.clients[projectID][conn] = true
}

// Unregister removes a WebSocket connection from the project's client set.
func (h *Hub) Unregister(projectID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if conns, ok := h.clients[projectID]; ok {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(h.clients, projectID)
		}
	}
}

// Subscribe returns a channel that receives broadcast messages for a project.
func (h *Hub) Subscribe(projectID string) (<-chan any, func()) {
	ch := make(chan any, 32)

	h.mu.Lock()
	if h.subscribers[projectID] == nil {
		h.subscribers[projectID] = make(map[chan any]struct{})
	}
	h.subscribers[projectID][ch] = struct{}{}
	h.mu.Unlock()

	unsubscribe := func() {
		h.mu.Lock()
		if subs, ok := h.subscribers[projectID]; ok {
			if _, exists := subs[ch]; exists {
				delete(subs, ch)
			}
			if len(subs) == 0 {
				delete(h.subscribers, projectID)
			}
		}
		h.mu.Unlock()
	}

	return ch, unsubscribe
}

// Broadcast sends a message to all connected clients for a project.
func (h *Hub) Broadcast(projectID string, message interface{}) {
	h.mu.RLock()
	conns := make([]*websocket.Conn, 0, len(h.clients[projectID]))
	for conn := range h.clients[projectID] {
		conns = append(conns, conn)
	}
	subscribers := make([]chan any, 0, len(h.subscribers[projectID]))
	for ch := range h.subscribers[projectID] {
		subscribers = append(subscribers, ch)
	}
	h.mu.RUnlock()

	for _, conn := range conns {
		if err := conn.WriteJSON(message); err != nil {
			log.Printf("WebSocket write error for project %s: %v", projectID, err)
			conn.Close()
			h.Unregister(projectID, conn)
		}
	}

	for _, ch := range subscribers {
		select {
		case ch <- message:
		default:
			log.Printf("WebSocket subscriber backlog for project %s", projectID)
		}
	}
}

// ServeWS upgrades an HTTP connection to WebSocket and registers it with the hub.
// It keeps the connection alive, reading (and discarding) any client messages
// until the connection is closed.
func (h *Hub) ServeWS(projectID string, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	h.Register(projectID, conn)
	defer h.Unregister(projectID, conn)

	// Keep reading to detect disconnects; discard messages.
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}
