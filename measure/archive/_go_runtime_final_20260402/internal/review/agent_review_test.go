package review

import (
	"strings"
	"testing"
)

func TestBuildReviewPrompt(t *testing.T) {
	taskSpec := "Add input validation to the login endpoint"
	diff := `diff --git a/src/auth.go b/src/auth.go
--- a/src/auth.go
+++ b/src/auth.go
@@ -10,6 +10,12 @@ func Login(w http.ResponseWriter, r *http.Request) {
+	if len(username) == 0 {
+		return nil, errors.New("username required")
+	}
`
	criteria := []string{"Correctness", "Security", "Test coverage"}

	prompt := BuildReviewPrompt(taskSpec, diff, criteria, DepthQuick)

	if !strings.Contains(prompt, taskSpec) {
		t.Error("prompt should contain the task spec")
	}
	if !strings.Contains(prompt, diff) {
		t.Error("prompt should contain the file diff")
	}
	for _, c := range criteria {
		if !strings.Contains(prompt, c) {
			t.Errorf("prompt should contain criteria %q", c)
		}
	}
	if !strings.Contains(prompt, "Respond with a JSON object") {
		t.Error("prompt should request JSON response format")
	}
}

func TestBuildReviewPrompt_Thorough(t *testing.T) {
	taskSpec := "Refactor the database connection pool"
	diff := "--- a/src/db.go\n+++ b/src/db.go\n@@ -1,5 +1,10 @@\n+import \"context\"\n"
	criteria := []string{"Correctness", "Performance", "Security", "Test coverage", "Code style"}

	prompt := BuildReviewPrompt(taskSpec, diff, criteria, DepthThorough)

	if !strings.Contains(prompt, "Perform a thorough, multi-aspect review") {
		t.Error("thorough prompt should mention thorough review")
	}
	if !strings.Contains(prompt, "Code style") {
		t.Error("thorough prompt should include all criteria")
	}
}

func TestBuildReviewPrompt_EmptyDiff(t *testing.T) {
	taskSpec := "Update documentation"
	prompt := BuildReviewPrompt(taskSpec, "", []string{"Correctness"}, DepthQuick)

	if !strings.Contains(prompt, "No file diff available") {
		t.Error("prompt should note when no diff is available")
	}
}

func TestBuildReviewPrompt_DefaultCriteria(t *testing.T) {
	prompt := BuildReviewPrompt("Some task", "some diff", nil, DepthQuick)

	defaultCriteria := []string{"Correctness", "Code style", "Test coverage", "Security"}
	for _, c := range defaultCriteria {
		if !strings.Contains(prompt, c) {
			t.Errorf("prompt should include default criteria %q", c)
		}
	}
}

func TestReviewResultParsing(t *testing.T) {
	tests := []struct {
		name       string
		input      string
		wantStatus string
		wantCount  int
	}{
		{
			name: "pass result",
			input: `{
				"status": "pass",
				"comments": []
			}`,
			wantStatus: "pass",
			wantCount:  0,
		},
		{
			name: "needs-changes with comments",
			input: `{
				"status": "needs-changes",
				"comments": [
					{"file": "src/auth.go", "line": 12, "severity": "high", "message": "Missing input validation"},
					{"file": "src/auth.go", "line": 20, "severity": "medium", "message": "Consider using prepared statements"}
				]
			}`,
			wantStatus: "needs-changes",
			wantCount:  2,
		},
		{
			name:       "malformed JSON",
			input:      `not json at all`,
			wantStatus: "",
			wantCount:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ParseReviewResult(tt.input)
			if tt.input == `not json at all` {
				if err == nil {
					t.Error("expected error for malformed JSON")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result.Status != tt.wantStatus {
				t.Errorf("status = %q, want %q", result.Status, tt.wantStatus)
			}
			if len(result.Comments) != tt.wantCount {
				t.Errorf("comment count = %d, want %d", len(result.Comments), tt.wantCount)
			}
		})
	}
}

func TestReviewCommentFields(t *testing.T) {
	input := `{"status":"needs-changes","comments":[{"file":"main.go","line":42,"severity":"high","message":"bug here"}]}`
	result, err := ParseReviewResult(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Comments) != 1 {
		t.Fatalf("expected 1 comment, got %d", len(result.Comments))
	}
	c := result.Comments[0]
	if c.File != "main.go" {
		t.Errorf("file = %q, want %q", c.File, "main.go")
	}
	if c.Line != 42 {
		t.Errorf("line = %d, want 42", c.Line)
	}
	if c.Severity != "high" {
		t.Errorf("severity = %q, want %q", c.Severity, "high")
	}
	if c.Message != "bug here" {
		t.Errorf("message = %q, want %q", c.Message, "bug here")
	}
}

func TestDepthString(t *testing.T) {
	if DepthQuick.String() != "quick" {
		t.Errorf("DepthQuick.String() = %q, want %q", DepthQuick.String(), "quick")
	}
	if DepthThorough.String() != "thorough" {
		t.Errorf("DepthThorough.String() = %q, want %q", DepthThorough.String(), "thorough")
	}
}

func TestParseDepth(t *testing.T) {
	tests := []struct {
		input string
		want  ReviewDepth
	}{
		{"quick", DepthQuick},
		{"thorough", DepthThorough},
		{"", DepthQuick},
		{"unknown", DepthQuick},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := ParseDepth(tt.input)
			if got != tt.want {
				t.Errorf("ParseDepth(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
