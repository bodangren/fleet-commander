package hub

import (
	"testing"
	"time"
)

func TestHubBroadcastPublishesToSubscribers(t *testing.T) {
	h := New()

	updates, unsubscribe := h.Subscribe("project-1")
	defer unsubscribe()

	message := map[string]string{"type": "stdout", "content": "hello"}
	h.Broadcast("project-1", message)

	select {
	case got := <-updates:
		payload, ok := got.(map[string]string)
		if !ok {
			t.Fatalf("expected map payload, got %T", got)
		}
		if payload["content"] != "hello" {
			t.Fatalf("expected content hello, got %q", payload["content"])
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for broadcast message")
	}
}
