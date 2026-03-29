package dispatcher

import (
	"sort"
)

type byScoreDesc []ScoredCandidate

func (a byScoreDesc) Len() int           { return len(a) }
func (a byScoreDesc) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
func (a byScoreDesc) Less(i, j int) bool { return a[i].Score > a[j].Score }

func Rank(scoredCandidates []ScoredCandidate) []ScoredCandidate {
	if len(scoredCandidates) == 0 {
		return scoredCandidates
	}

	ranked := make([]ScoredCandidate, len(scoredCandidates))
	for i, sc := range scoredCandidates {
		finalScore := sc.Score
		finalScore += float64(sc.Candidate.AgeBoost())
		sc.Score = finalScore
		ranked[i] = sc
	}

	sort.Sort(byScoreDesc(ranked))

	for i := range ranked {
		ranked[i].Rank = i + 1
	}

	return ranked
}

func SelectTop(scoredCandidates []ScoredCandidate) *ScoredCandidate {
	if len(scoredCandidates) == 0 {
		return nil
	}

	ranked := Rank(scoredCandidates)
	return &ranked[0]
}
