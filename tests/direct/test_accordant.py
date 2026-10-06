"""Starter invariant checklist.

The builder must replace/expand this with actual GenLayer Direct Mode tests compatible
with repository-local CLI 0.39.1 and the final contract source.
"""

def test_v1_outcome_precedence_documented():
    required = ["MET", "UNVERIFIABLE"]
    if "NOT_MET" in required:
        result = "REVISION_REQUIRED"
    elif "UNVERIFIABLE" in required:
        result = "INCONCLUSIVE"
    else:
        result = "ACCEPTED"
    assert result == "INCONCLUSIVE"
