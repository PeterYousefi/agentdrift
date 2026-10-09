from app.evaluation import evaluate


def test_held_out_policy_regression():
    result = evaluate()
    assert result["runs"] == 120
    assert result["confusionMatrix"] == {"tp": 80, "fp": 0, "tn": 40, "fn": 0}
    assert result["byScenario"]["benign-unusual"]["alerts"] == 0
    assert result["byScenario"]["read-then-send"]["alerts"] == 20
