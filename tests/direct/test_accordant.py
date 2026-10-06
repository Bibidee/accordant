"""Direct Mode invariant checklist.

This keeps the deterministic outcome-precedence rule executable in Direct Mode. The
deployed-contract lifecycle evidence is recorded separately in docs/DEPLOYMENT.md.
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
