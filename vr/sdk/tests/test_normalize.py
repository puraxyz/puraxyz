"""Tests for z-score normalization."""


from vrdev.core.normalize import z_score_normalize


class TestZScoreNormalize:
    def test_empty_list(self):
        assert z_score_normalize([]) == []

    def test_single_element(self):
        assert z_score_normalize([5.0]) == [0.0]

    def test_identical_scores(self):
        result = z_score_normalize([0.5, 0.5, 0.5])
        assert all(r == 0.0 for r in result)

    def test_two_elements_symmetric(self):
        result = z_score_normalize([0.0, 1.0])
        # Mean = 0.5, std = 0.5
        assert abs(result[0] - (-1.0)) < 1e-6
        assert abs(result[1] - 1.0) < 1e-6

    def test_mean_is_zero(self):
        scores = [0.2, 0.4, 0.6, 0.8, 1.0]
        result = z_score_normalize(scores)
        mean = sum(result) / len(result)
        assert abs(mean) < 1e-6

    def test_variance_is_one(self):
        scores = [0.1, 0.3, 0.5, 0.7, 0.9]
        result = z_score_normalize(scores)
        n = len(result)
        mean = sum(result) / n
        variance = sum((r - mean) ** 2 for r in result) / n
        assert abs(variance - 1.0) < 1e-6

    def test_preserves_ordering(self):
        scores = [0.1, 0.5, 0.3, 0.9, 0.7]
        result = z_score_normalize(scores)
        for i in range(len(scores)):
            for j in range(len(scores)):
                if scores[i] < scores[j]:
                    assert result[i] < result[j]

    def test_negative_inputs(self):
        scores = [-1.0, 0.0, 1.0]
        result = z_score_normalize(scores)
        assert len(result) == 3
        assert abs(sum(result) / 3) < 1e-6

    def test_large_batch(self):
        scores = [float(i) / 100.0 for i in range(101)]
        result = z_score_normalize(scores)
        assert len(result) == 101
        assert abs(sum(result) / len(result)) < 1e-6
