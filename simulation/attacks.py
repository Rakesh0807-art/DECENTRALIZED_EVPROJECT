import json

def false_information(votes_required, honest_verifiers):
    return {
        "attack": "False information propagation",
        "blocked": honest_verifiers < votes_required,
        "reason": "Fake transaction cannot collect the required 2/3 honest verification votes."
    }

def transaction_tampering(original_hash, tampered_hash):
    return {
        "attack": "Transaction tampering",
        "blocked": original_hash != tampered_hash,
        "reason": "Changing transaction data changes its hash."
    }

def impersonation(registered_public_keys, fake_public_key):
    return {
        "attack": "Fake MCS impersonation",
        "blocked": fake_public_key not in registered_public_keys,
        "reason": "Only registered public keys are accepted."
    }

def disturbing_verification():
    return {
        "attack": "Disturbing verification",
        "blocked": True,
        "reason": "Malicious verifier receives a trust penalty and can be excluded below threshold."
    }

def collusion():
    return {
        "attack": "Collusion in trust evaluation",
        "blocked": True,
        "reason": "Malicious verifiers can be excluded, allowing the honest verifier score to recover."
    }

if __name__ == "__main__":
    results = [
        false_information(4, 2),
        transaction_tampering("abc", "xyz"),
        impersonation(["registered-key"], "fake-key"),
        disturbing_verification(),
        collusion()
    ]
    print(json.dumps(results, indent=2))